import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GooglePlacePhoto,
  resolveGooglePlacePhoto,
} from 'src/common/google-place-photo';
import { MerchantMatchDto } from './dto/merchant-match.dto';

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  primaryType?: string;
  photos?: GooglePlacePhoto[];
};

@Injectable()
export class MerchantMatchService {
  constructor(private readonly config: ConfigService) {}

  async match(dto: MerchantMatchDto) {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey)
      throw new ServiceUnavailableException(
        'Google Maps API key is not configured.',
      );

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType,places.photos',
        },
        body: JSON.stringify({
          textQuery: [dto.merchantName, dto.receiptAddress]
            .filter(Boolean)
            .join(' '),
          pageSize: 5,
          languageCode: dto.languageCode ?? 'en',
          locationBias: {
            circle: {
              center: { latitude: dto.latitude, longitude: dto.longitude },
              radius: 5000,
            },
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      places?: GooglePlace[];
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new BadGatewayException(
        payload.error?.message ?? 'Unable to search nearby establishments.',
      );
    }

    const candidates = (payload.places ?? [])
      .flatMap((place) => {
        const latitude = place.location?.latitude;
        const longitude = place.location?.longitude;
        const name = place.displayName?.text;
        if (!place.id || !name || latitude == null || longitude == null)
          return [];
        const distance = this.distance(
          dto.latitude,
          dto.longitude,
          latitude,
          longitude,
        );
        const nameScore = this.similarity(dto.merchantName, name);
        const addressScore = dto.receiptAddress
          ? this.similarity(dto.receiptAddress, place.formattedAddress ?? '')
          : 0;
        const distanceScore = Math.max(0, 1 - distance / 5000);
        const confidence = Math.round(
          Math.min(
            1,
            nameScore * 0.65 + distanceScore * 0.25 + addressScore * 0.1,
          ) * 100,
        );
        return [
          {
            placeId: place.id,
            name,
            address: place.formattedAddress ?? '',
            latitude,
            longitude,
            distanceMeters: Math.round(distance),
            confidence,
            googleMapsUri: place.googleMapsUri ?? null,
            primaryType: place.primaryType ?? null,
            photo: place.photos?.[0],
          },
        ];
      })
      .sort(
        (a, b) =>
          b.confidence - a.confidence || a.distanceMeters - b.distanceMeters,
      );

    return {
      candidates: await Promise.all(
        candidates.map(async ({ photo, ...candidate }) => ({
          ...candidate,
          ...(await resolveGooglePlacePhoto(apiKey, photo)),
        })),
      ),
    };
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .trim();
  }

  private similarity(left: string, right: string) {
    const a = new Set(this.normalize(left).split(' ').filter(Boolean));
    const b = new Set(this.normalize(right).split(' ').filter(Boolean));
    if (!a.size || !b.size) return 0;
    const intersection = [...a].filter((token) => b.has(token)).length;
    return intersection / new Set([...a, ...b]).size;
  }

  private distance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const rad = (value: number) => (value * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
}
