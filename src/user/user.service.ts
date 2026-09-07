import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import {
  AuthProvider,
  SubscriptionStatus,
  User,
  UserRole,
} from './entities/user.entity';
import { CurrencyService } from 'src/currency/currency.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CountryService } from 'src/country/country.service';
import { LanguageService } from 'src/language/language.service';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { Payment, PaymentStatus } from 'src/payment/entities/payment.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Country) private countryRepo: Repository<Country>,
    @InjectRepository(Language) private languageRepo: Repository<Language>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private currencyService: CurrencyService,
    config: ConfigService,
    @Inject('FIREBASE_ADMIN') private firebaseApp: App,
  ) {
    this.appBaseUrl = config
      .get<string>('APP_BASE_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
  }

  private normalizePhotoUrl(user: User): User {
    if (user.photoURL) {
      user.photoURL = user.photoURL.replace(
        /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/files\/)/i,
        this.appBaseUrl,
      );
    }
    return user;
  }

  private async repairMissingSubscriptionEnd(user: User): Promise<User> {
    if (
      user.subscriptionStatus !== SubscriptionStatus.ACTIVE ||
      user.subscriptionEndsAt
    ) {
      return user;
    }

    const payments = await this.paymentRepo.find({
      where: { userId: user.id, status: PaymentStatus.SUCCEEDED },
      relations: { plan: true },
      order: { createdAt: 'ASC' },
    });

    let calculatedEnd: Date | null = null;
    for (const payment of payments) {
      if (!payment.plan?.durationMonths) continue;
      const paidAt = new Date(payment.createdAt);
      const startsAt =
        calculatedEnd && calculatedEnd > paidAt
          ? new Date(calculatedEnd)
          : paidAt;
      startsAt.setMonth(startsAt.getMonth() + payment.plan.durationMonths);
      calculatedEnd = startsAt;
    }

    if (!calculatedEnd) return user;

    user.subscriptionEndsAt = calculatedEnd;
    if (calculatedEnd <= new Date()) {
      user.subscriptionStatus = SubscriptionStatus.EXPIRED;
    }
    return this.usersRepo.save(user);
  }

  /**
   * Stamps the user's role onto their Firebase ID token as a custom claim
   * (`role: 'admin' | 'user'`). This lets Firebase Realtime Database security
   * rules distinguish admins from regular users (via `auth.token.role`)
   * without the RTDB rules needing to call back into our SQL database.
   *
   * Note: custom claims only take effect on the *next* ID token the client
   * fetches (e.g. after `getIdToken(true)` or their next natural refresh),
   * not on the token that's currently in use.
   */
  private async syncRoleClaim(
    firebaseUid: string,
    role: UserRole,
  ): Promise<void> {
    try {
      await getAuth(this.firebaseApp).setCustomUserClaims(firebaseUid, {
        role,
      });
    } catch (err) {
      this.logger.error(
        `Failed to sync role claim for ${firebaseUid}: ${(err as Error).message}`,
      );
    }
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
    image?: Express.Multer.File,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (image) {
      if (user.provider !== AuthProvider.PASSWORD) {
        throw new BadRequestException(
          'Profile image can only be changed for password accounts',
        );
      }
      user.photoURL = `${this.appBaseUrl}/files/profile-images/${encodeURIComponent(image.filename)}`;
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.currencyId) {
      const currency = await this.currencyService.findOne(dto.currencyId);
      if (!currency) {
        throw new BadRequestException('Currency not found');
      }
      // Set BOTH — the relation object and the FK column — so TypeORM's
      // eager-relation persistence doesn't clobber the column with the
      // stale relation object it loaded in `findOne`.
      user.currency = currency;
      user.currencyId = dto.currencyId;
    }

    if (dto.currentCountryId) {
      const country = await this.countryRepo.findOne({
        where: { id: dto.currentCountryId },
      });
      if (!country) {
        throw new BadRequestException('Country not found');
      }
      user.currentCountry = country;
      user.currentCountryId = dto.currentCountryId;
    }

    if (dto.languageId) {
      const language = await this.languageRepo.findOne({
        where: { id: dto.languageId },
      });
      if (!language) {
        throw new BadRequestException('Language not found');
      }
      user.language = language;
      user.languageId = dto.languageId;
    }

    return await this.usersRepo.save(user);
  }
  async findOrCreateFromFirebase(decoded: DecodedIdToken): Promise<User> {
    let user = await this.usersRepo.findOne({
      where: { firebaseUid: decoded.uid },
    });

    if (user) {
      if (
        user.subscriptionStatus === SubscriptionStatus.TRIAL &&
        user.trialEndsAt &&
        user.trialEndsAt < new Date()
      ) {
        user.subscriptionStatus = SubscriptionStatus.EXPIRED;
        user = await this.usersRepo.save(user);
      }
      return this.repairMissingSubscriptionEnd(user);
    }

    const defaultCurrency = await this.currencyService.findByCode('USD');
    const signInProvider = decoded.firebase?.sign_in_provider;
    let provider = AuthProvider.PASSWORD;
    if (signInProvider === 'google.com') provider = AuthProvider.GOOGLE;
    if (signInProvider === 'facebook.com') provider = AuthProvider.FACEBOOK;

    const newUser = this.usersRepo.create({
      firebaseUid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? '',
      photoURL: decoded.picture ?? undefined,
      provider,
      currencyId: defaultCurrency.id,
    });

    const saved = await this.usersRepo.save(newUser);
    await this.syncRoleClaim(saved.firebaseUid, saved.role);
    return saved;
  }

  async findById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    return user ? this.normalizePhotoUrl(user) : null;
  }

  // ── Admin CRUD ────────────────────────────────
  async findAll(
    page = 1,
    limit = 25,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.usersRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((user) => this.normalizePhotoUrl(user)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.normalizePhotoUrl(
      await this.repairMissingSubscriptionEnd(user),
    );
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.currencyId) {
      const currency = await this.currencyService.findOne(dto.currencyId);
      if (!currency)
        throw new BadRequestException(`Currency ${dto.currencyId} not found`);
    }

    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async setRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    user.role = role;
    const saved = await this.usersRepo.save(user);
    await this.syncRoleClaim(saved.firebaseUid, saved.role);
    return saved;
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = isActive;
    return this.usersRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepo.remove(user);
  }

  async deleteOwnAccount(user: User, confirmEmail: string) {
    if (confirmEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      throw new BadRequestException('Email confirmation does not match');
    }

    await this.usersRepo.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from('payments')
        .where('userId = :id', { id: user.id })
        .execute();
      await manager
        .createQueryBuilder()
        .delete()
        .from('notifications')
        .where('userId = :id', { id: user.id })
        .execute();
      await manager
        .createQueryBuilder()
        .delete()
        .from('device_tokens')
        .where('userId = :id', { id: user.id })
        .execute();
      await manager
        .createQueryBuilder()
        .delete()
        .from('chat_conversations')
        .where('userId = :uid', { uid: user.firebaseUid })
        .execute();
      await manager.delete(User, user.id);
    });

    try {
      await getAuth(this.firebaseApp).deleteUser(user.firebaseUid);
    } catch (error) {
      this.logger.error(
        `SQL account deleted but Firebase deletion failed for ${user.firebaseUid}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Account data was deleted, but authentication cleanup failed. Please contact support.',
      );
    }
    return { deleted: true };
  }
}
