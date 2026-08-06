import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { UsersService } from '../user/user.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseApp: App,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const idToken = authHeader.split(' ')[1];

    try {
      const decoded: DecodedIdToken = await getAuth(this.firebaseApp).verifyIdToken(idToken);
      const user = await this.usersService.findOrCreateFromFirebase(decoded);

      request.user = user;
      request.firebaseUser = decoded;

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}