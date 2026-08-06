import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { User, UserRole, AuthProvider } from './entities/user.entity';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private config: ConfigService,
    @Inject('FIREBASE_ADMIN') private firebaseApp: App,
  ) {}

  async onModuleInit() {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.',
      );
      return;
    }

    // Already exists in our DB? Nothing to do.
    const existing = await this.usersRepo.findOne({
      where: { email: adminEmail },
    });
    if (existing) {
      this.logger.log(
        `Admin account already exists (${adminEmail}) — skipping.`,
      );
      return;
    }

    const auth = getAuth(this.firebaseApp);

    // Find or create the Firebase user first
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(adminEmail);
      this.logger.log(`Found existing Firebase user for ${adminEmail}.`);
    } catch {
      firebaseUser = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: true,
      });
      this.logger.log(`Created Firebase user for ${adminEmail}.`);
    }

    // Create the matching SQL row with admin role
    const admin = this.usersRepo.create({
      firebaseUid: firebaseUser.uid,
      email: adminEmail,
      displayName: 'Administrator',
      provider: AuthProvider.PASSWORD,
      role: UserRole.ADMIN,
      subscriptionStatus: undefined, // let default apply, or set ACTIVE below if you prefer
    });

    await this.usersRepo.save(admin);

    try {
      await auth.setCustomUserClaims(firebaseUser.uid, { role: UserRole.ADMIN });
    } catch (err) {
      this.logger.error(
        `Failed to set admin role claim for ${adminEmail}: ${(err as Error).message}`,
      );
    }

    this.logger.log(`Admin SQL user created for ${adminEmail}.`);
  }
}
