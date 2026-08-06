// src/common/decorators/response-message.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

export interface ResponseMessageOptions {
  message: string;
  translate?: boolean; // default true
}

/**
 * Overrides the default "Loaded successfully" / "Created successfully"
 * etc. message for this route.
 *
 * @ResponseMessage('Profile updated')
 * @ResponseMessage({ message: 'Welcome back', translate: false })
 */
export function ResponseMessage(
  messageOrOptions: string | ResponseMessageOptions,
) {
  const options: ResponseMessageOptions =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, translate: true }
      : { translate: true, ...messageOrOptions };

  return SetMetadata(RESPONSE_MESSAGE_KEY, options);
}