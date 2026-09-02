import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GooglePlacePhoto,
  resolveGooglePlacePhoto,
} from 'src/common/google-place-photo';
import { NotificationSource } from 'src/notification/entities/notification.entity';
import { NotificationService } from 'src/notification/notification.service';
import { LocationCheckInDto } from './dto/location-check-in.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { InterpreterAiService } from '../interpreter/interpreter-ai.service';

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  photos?: GooglePlacePhoto[];
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string; languageCode?: string };
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
};

const DISCOVERY_TYPES = [
  'tourist_attraction',
  'historical_landmark',
  'monument',
  'museum',
  'restaurant',
  'cafe',
  'park',
  'shopping_mall',
  'supermarket',
];
// Limit nearby discovery and recommendation notifications to once per hour.
const CHECK_COOLDOWN = 60 * 60 * 1000;
const SAME_PLACE_COOLDOWN = 2 * 60 * 1000;

@Injectable()
export class ExploreService {
  private readonly logger = new Logger(ExploreService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
    private readonly interpreterAi: InterpreterAiService,
  ) {}

  async getPlaceDetails(placeId: string, languageCode = 'en') {
    const apiKey = this.config.getOrThrow<string>('GOOGLE_MAPS_API_KEY');
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(languageCode)}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,location,googleMapsUri,primaryType,primaryTypeDisplayName,photos,rating,userRatingCount,websiteUri,internationalPhoneNumber,regularOpeningHours,editorialSummary',
        },
      },
    );
    const place = (await response.json()) as GooglePlace & {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new BadGatewayException(
        place.error?.message ?? 'Unable to load place details.',
      );
    const photos = await Promise.all(
      (place.photos ?? [])
        .slice(0, 8)
        .map((photo) => resolveGooglePlacePhoto(apiKey, photo)),
    );
    const name = place.displayName?.text ?? 'Place';
    const type =
      place.primaryTypeDisplayName?.text ??
      place.primaryType?.replace(/_/g, ' ') ??
      'place';
    const address = place.formattedAddress ?? '';
    const rating = place.rating
      ? ` It has a Google rating of ${place.rating} from ${place.userRatingCount ?? 0} reviews.`
      : '';
    const narration = `${name} is a ${type} located at ${address}.${rating}`;
    return { ...place, name, address, narration, photos };
  }

  async narratePlace(
    placeId: string,
    targetLanguage: string,
    sourceDescription?: string,
  ) {
    const description =
      sourceDescription?.trim() ||
      (await this.generatePlaceDescription(placeId, 'en')).description;
    const translatedText = targetLanguage.toLowerCase().startsWith('en')
      ? description
      : await this.interpreterAi.translate(description, 'en', targetLanguage);
    const audio = await this.interpreterAi.synthesize(
      translatedText,
      targetLanguage,
    );
    return {
      text: translatedText,
      audio: `data:${audio.mimeType};base64,${audio.audio.toString('base64')}`,
      mimeType: audio.mimeType,
    };
  }

  async generatePlaceDescription(placeId: string, languageCode = 'en') {
    const place = await this.getPlaceDetails(placeId, 'en');
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;
    if (latitude == null || longitude == null) {
      throw new BadGatewayException('Google Places returned no coordinates.');
    }

    try {
      const description = await this.interpreterAi.describePlace({
        name: place.name,
        latitude,
        longitude,
        address: place.address,
        placeType:
          place.primaryTypeDisplayName?.text ?? place.primaryType ?? undefined,
        languageCode,
      });
      return { description, source: 'ai' as const };
    } catch (error) {
      this.logger.warn(
        `AI place description unavailable for ${placeId}; using Google Places metadata: ${error instanceof Error ? error.message : String(error)}`,
      );

      const fallback = place.editorialSummary?.text?.trim() || place.narration;
      if (languageCode.toLowerCase().startsWith('en')) {
        return { description: fallback, source: 'place-metadata' as const };
      }

      try {
        const translated = await this.interpreterAi.translate(
          fallback,
          place.editorialSummary?.languageCode ?? 'en',
          languageCode,
        );
        return { description: translated, source: 'place-metadata' as const };
      } catch (translationError) {
        this.logger.warn(
          `Fallback place-description translation unavailable for ${placeId}: ${translationError instanceof Error ? translationError.message : String(translationError)}`,
        );
        return { description: fallback, source: 'place-metadata' as const };
      }
    }
  }

  async findNearby(dto: NearbySearchDto) {
    const places = await this.searchNearby(
      dto.latitude,
      dto.longitude,
      dto.languageCode ?? 'en',
      dto.radius,
    );
    const validPlaces = places
      .flatMap((place) => {
        const name = place.displayName?.text;
        const latitude = place.location?.latitude;
        const longitude = place.location?.longitude;
        if (!place.id || !name || latitude == null || longitude == null)
          return [];
        const types = place.types ?? [];
        return [
          {
            placeId: place.id,
            name,
            address: place.formattedAddress ?? '',
            latitude,
            longitude,
            distanceMeters: Math.round(
              this.distance(dto.latitude, dto.longitude, latitude, longitude),
            ),
            primaryType: place.primaryType ?? null,
            types,
            googleMapsUri: place.googleMapsUri ?? null,
            category: this.categoryFor(types),
            photo: place.photos?.[0],
          },
        ];
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
    const apiKey = this.config.getOrThrow<string>('GOOGLE_MAPS_API_KEY');
    return {
      places: await Promise.all(
        validPlaces.map(async ({ photo, ...place }) => ({
          ...place,
          ...(await resolveGooglePlacePhoto(apiKey, photo)),
        })),
      ),
    };
  }

  async checkIn(userId: string, dto: LocationCheckInDto) {
    const previous = await this.notifications.findRecentForUser(userId);
    const nearbyAlerts = previous.filter(
      (item) => item.data?.type === 'nearby-place',
    );
    const lastAlert = nearbyAlerts[0];
    if (
      lastAlert &&
      Date.now() - lastAlert.createdAt.getTime() < CHECK_COOLDOWN
    ) {
      return { recommended: false, reason: 'cooldown' };
    }

    const places = await this.searchNearby(
      dto.latitude,
      dto.longitude,
      dto.languageCode ?? 'en',
    );
    const candidates = places
      .map((place) => ({
        ...place,
        distanceMeters: this.distance(
          dto.latitude,
          dto.longitude,
          place.location?.latitude,
          place.location?.longitude,
        ),
      }))
      .filter(
        (place) =>
          place.id &&
          place.displayName?.text &&
          place.googleMapsUri &&
          place.distanceMeters <= 3000,
      )
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const place = candidates.find(
      (candidate) =>
        !nearbyAlerts.some(
          (alert) =>
            alert.data?.placeId === candidate.id &&
            Date.now() - alert.createdAt.getTime() < SAME_PLACE_COOLDOWN,
        ),
    );
    if (!place) return { recommended: false, reason: 'no-new-place' };

    const name = place.displayName!.text!;
    const distance =
      place.distanceMeters < 1000
        ? `${Math.round(place.distanceMeters)} m`
        : `${(place.distanceMeters / 1000).toFixed(1)} km`;
    const copy = this.copy(dto.languageCode ?? 'en', name, distance);
    const notification = await this.notifications.create(
      {
        userId,
        title: copy.title,
        body: copy.body,
        data: {
          type: 'nearby-place',
          placeId: place.id!,
          placeName: name,
          googleMapsUri: place.googleMapsUri!,
          latitude: String(place.location?.latitude ?? ''),
          longitude: String(place.location?.longitude ?? ''),
          distanceMeters: String(Math.round(place.distanceMeters)),
        },
        sendPush: true,
      },
      NotificationSource.EVENT,
    );

    return {
      recommended: true,
      notificationId: notification.id,
      place: {
        id: place.id,
        name,
        address: place.formattedAddress,
        googleMapsUri: place.googleMapsUri,
        distanceMeters: Math.round(place.distanceMeters),
      },
    };
  }

  private async searchNearby(
    latitude: number,
    longitude: number,
    languageCode: string,
    radius = 3000,
  ): Promise<GooglePlace[]> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey)
      throw new ServiceUnavailableException(
        'Google Maps API key is not configured.',
      );
    const requestBody = JSON.stringify({
      includedTypes: DISCOVERY_TYPES,
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode,
      locationRestriction: {
        circle: { center: { latitude, longitude }, radius },
      },
    });

    let response: Response | null = null;
    let networkError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        response = await fetch(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType,places.types,places.photos',
            },
            body: requestBody,
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (response.ok || (response.status < 500 && response.status !== 429)) {
          break;
        }
      } catch (error) {
        networkError = error;
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    if (!response) {
      this.logger.error(
        `Google Nearby Search network failure: ${networkError instanceof Error ? networkError.message : 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Nearby search is temporarily unavailable because Google Places could not be reached.',
      );
    }
    const payload = (await response.json()) as {
      places?: GooglePlace[];
      error?: { message?: string };
    };
    if (!response.ok) {
      const upstreamMessage =
        payload.error?.message ?? 'Unable to search nearby places.';
      this.logger.error(
        `Google Nearby Search failed (${response.status}): ${upstreamMessage}`,
      );
      throw new BadGatewayException(
        `Google Places rejected the nearby search (${response.status}): ${upstreamMessage}`,
      );
    }
    const places = payload.places ?? [];
    const placesWithPhotos = places.filter((place) =>
      place.photos?.some((photo) => Boolean(photo.name)),
    ).length;

    this.logger.log(
      `Google Nearby Search returned ${places.length} places; ${placesWithPhotos} include a usable photo resource`,
    );

    if (places.length > 0 && placesWithPhotos === 0) {
      this.logger.warn(
        'Google Nearby Search returned no photo resources even though places.photos is included in the field mask',
      );
    }

    return places;
  }

  private distance(lat1: number, lon1: number, lat2?: number, lon2?: number) {
    if (lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY;
    const rad = (value: number) => (value * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private categoryFor(types: string[]) {
    if (
      types.some((type) =>
        ['restaurant', 'meal_takeaway', 'meal_delivery'].includes(type),
      )
    )
      return 'food';
    if (types.some((type) => ['cafe', 'coffee_shop', 'bakery'].includes(type)))
      return 'cafes';
    if (
      types.some((type) =>
        ['museum', 'art_gallery', 'cultural_landmark'].includes(type),
      )
    )
      return 'culture';
    if (
      types.some((type) => ['park', 'national_park', 'garden'].includes(type))
    )
      return 'parks';
    if (
      types.some((type) => ['shopping_mall', 'market', 'store'].includes(type))
    )
      return 'shopping';
    return 'sights';
  }

  private copy(language: string, name: string, distance: string) {
    if (language === 'ar')
      return {
        title: 'مكان قريب يستحق الزيارة',
        body: `أنت على بعد ${distance} من ${name}. اكتشفه الآن!`,
      };
    if (language === 'fr')
      return {
        title: 'Un lieu à découvrir à proximité',
        body: `Vous êtes à ${distance} de ${name}. Découvrez-le !`,
      };
    return {
      title: 'A nearby place worth discovering',
      body: `You're ${distance} from ${name}. Check it out!`,
    };
  }
}
