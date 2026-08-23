import { Body, Controller, Post, Inject, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { IdpLoginDto } from './dto/idp-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from 'src/user/user.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    @Inject('FIREBASE_ADMIN') private firebaseApp: App,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email already in use or invalid input',
  })
  async register(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto.email, dto.password);
    const user = await this.syncUser(result.idToken);
    return { user, idToken: result.idToken, refreshToken: result.refreshToken };
  }

  @Post('send-reset-mail')
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Step 1: verify the email and send a 4-digit code' })
  @ApiBody({ type: ForgotPasswordDto })
  async sendResetMail(@Body() dto: ForgotPasswordDto) {
    return this.authService.send_reset_mail(dto.email);
  }

  @Post('validate-reset-mail')
  @Throttle({ default: { limit: 5, ttl: 5 * 60_000 } })
  @ApiOperation({
    summary: 'Step 2: verify the code, receive a resetPassToken',
  })
  @ApiBody({ type: VerifyOtpDto })
  async validateResetMail(@Body() dto: VerifyOtpDto) {
    return this.authService.validate_reset_mail(dto.email, dto.otp);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @ApiOperation({
    summary: 'Step 3: reset the password using email + resetPassToken',
  })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.reset_password(
      dto.email,
      dto.newPassword,
      dto.resetPassToken,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto.email, dto.password);
    const user = await this.syncUser(result.idToken);
    return { user, idToken: result.idToken, refreshToken: result.refreshToken };
  }

  @Post('oauth')
  @ApiOperation({
    summary: 'Login with Google or Facebook using a provider token',
  })
  @ApiBody({ type: IdpLoginDto })
  @ApiResponse({
    status: 200,
    description: 'OAuth login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired provider token',
  })
  async oauthLogin(@Body() dto: IdpLoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.loginWithIdp(
      dto.provider,
      dto.token,
      'http://localhost:3000',
    );
    const user = await this.syncUser(result.idToken);
    return { user, idToken: result.idToken, refreshToken: result.refreshToken };
  }

  @Post('firebase-token')
  @UseGuards(FirebaseAuthGuard)
  async getFirebaseCustomToken(@CurrentUser() user: User) {
    const customToken = await getAuth(this.firebaseApp).createCustomToken(
      user.firebaseUid,
      {
        role: user.role, // 'admin' | 'user' — matches your RTDB rules' auth.token.role check
      },
    );
    return { customToken };
  }
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh an expired ID token using a refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // Verify the fresh idToken and sync/create the SQL user row
  private async syncUser(idToken: string) {
    const decoded = await getAuth(this.firebaseApp).verifyIdToken(idToken);
    return this.usersService.findOrCreateFromFirebase(decoded);
  }
}
