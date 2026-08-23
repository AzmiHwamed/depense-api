import { Logger } from '@nestjs/common';

export type GooglePhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

export type GooglePlacePhoto = {
  name?: string;
  authorAttributions?: GooglePhotoAttribution[];
};

const logger = new Logger('GooglePlacePhotoResolver');

export async function resolveGooglePlacePhoto(
  apiKey: string,
  photo?: GooglePlacePhoto,
) {
  const photoAttributions = photo?.authorAttributions ?? [];

  if (!photo?.name) return { photoUri: null, photoAttributions };

  try {
    const url = new URL(`https://places.googleapis.com/v1/${photo.name}/media`);
    url.searchParams.set('maxWidthPx', '800');
    url.searchParams.set('skipHttpRedirect', 'true');
    url.searchParams.set('key', apiKey);
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.warn(
        `Google Place Photo request failed for ${photo.name}: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
      );
      return { photoUri: null, photoAttributions };
    }
    const payload = (await response.json()) as { photoUri?: string };

    if (!payload.photoUri) {
      logger.warn(
        `Google Place Photo response did not include photoUri for ${photo.name}`,
      );
    }

    return {
      photoUri: payload.photoUri ?? null,
      photoAttributions,
    };
  } catch (error) {
    // A missing photo must not make the place search itself fail.
    logger.warn(
      `Unable to resolve Google Place Photo for ${photo.name}`,
      error instanceof Error ? error.stack : String(error),
    );
    return { photoUri: null, photoAttributions };
  }
}
