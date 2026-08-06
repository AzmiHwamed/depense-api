// src/auth/optional-firebase-auth.guard.ts
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';

/**
 * Same as FirebaseAuthGuard, but never blocks the request.
 *
 * - Valid token  -> request.user is populated, request proceeds
 * - No token / invalid token -> request.user stays undefined, request
 *   still proceeds (no 401)
 *
 * Use on routes where being logged in is optional but unlocks extra
 * behavior (e.g. auto-translation based on the user's saved language).
 */
@Injectable()
export class OptionalFirebaseAuthGuard extends FirebaseAuthGuard {
  private readonly logger = new Logger(OptionalFirebaseAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Reuses all of FirebaseAuthGuard's existing token verification
      // and request.user assignment logic.
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      this.logger.debug(
        `Optional auth: no valid token, proceeding as anonymous (${error instanceof Error ? error.message : 'unknown error'})`,
      );
      return true; // never block, just proceed without request.user
    }
  }
}