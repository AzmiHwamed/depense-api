import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationSource } from 'src/notification/entities/notification.entity';
import { NotificationService } from 'src/notification/notification.service';
import { LocationCheckInDto } from './dto/location-check-in.dto';

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  types?: string[];
};

const DISCOVERY_TYPES = [
  'tourist_attraction', 'historical_landmark', 'monument', 'museum',
  'restaurant', 'cafe', 'park', 'shopping_mall', 'supermarket',
];
// Limit nearby discovery and recommendation notifications to once per hour.
const CHECK_COOLDOWN = 60 * 60 * 1000;
const SAME_PLACE_COOLDOWN = 2 * 60 * 1000;

@Injectable()
export class ExploreService {
  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  async checkIn(userId: string, dto: LocationCheckInDto) {
    const previous = await this.notifications.findRecentForUser(userId);
    const nearbyAlerts = previous.filter((item) => item.data?.type === 'nearby-place');
    const lastAlert = nearbyAlerts[0];
    if (lastAlert && Date.now() - lastAlert.createdAt.getTime() < CHECK_COOLDOWN) {
      return { recommended: false, reason: 'cooldown' };
    }

    const places = await this.searchNearby(dto.latitude, dto.longitude, dto.languageCode ?? 'en');
    const candidates = places
      .map((place) => ({ ...place, distanceMeters: this.distance(dto.latitude, dto.longitude, place.location?.latitude, place.location?.longitude) }))
      .filter((place) => place.id && place.displayName?.text && place.googleMapsUri && place.distanceMeters <= 3000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const place = candidates.find((candidate) => !nearbyAlerts.some(
      (alert) => alert.data?.placeId === candidate.id && Date.now() - alert.createdAt.getTime() < SAME_PLACE_COOLDOWN,
    ));
    if (!place) return { recommended: false, reason: 'no-new-place' };

    const name = place.displayName!.text!;
    const distance = place.distanceMeters < 1000
      ? `${Math.round(place.distanceMeters)} m`
      : `${(place.distanceMeters / 1000).toFixed(1)} km`;
    const copy = this.copy(dto.languageCode ?? 'en', name, distance);
    const notification = await this.notifications.create({
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
    }, NotificationSource.EVENT);

    return {
      recommended: true,
      notificationId: notification.id,
      place: { id: place.id, name, address: place.formattedAddress, googleMapsUri: place.googleMapsUri, distanceMeters: Math.round(place.distanceMeters) },
    };
  }

  private async searchNearby(latitude: number, longitude: number, languageCode: string): Promise<GooglePlace[]> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Google Maps API key is not configured.');
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.types',
      },
      body: JSON.stringify({
        includedTypes: DISCOVERY_TYPES,
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        languageCode,
        locationRestriction: { circle: { center: { latitude, longitude }, radius: 3000 } },
      }),
    });
    const payload = await response.json() as { places?: GooglePlace[]; error?: { message?: string } };
    if (!response.ok) throw new BadGatewayException(payload.error?.message ?? 'Unable to search nearby places.');
    return payload.places ?? [];
  }

  private distance(lat1: number, lon1: number, lat2?: number, lon2?: number) {
    if (lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY;
    const rad = (value: number) => value * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private copy(language: string, name: string, distance: string) {
    if (language === 'ar') return { title: 'مكان قريب يستحق الزيارة', body: `أنت على بعد ${distance} من ${name}. اكتشفه الآن!` };
    if (language === 'fr') return { title: 'Un lieu à découvrir à proximité', body: `Vous êtes à ${distance} de ${name}. Découvrez-le !` };
    return { title: 'A nearby place worth discovering', body: `You're ${distance} from ${name}. Check it out!` };
  }
}
