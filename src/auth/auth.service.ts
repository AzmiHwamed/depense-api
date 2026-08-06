import { Injectable, UnauthorizedException, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { App } from 'node_modules/firebase-admin/lib/app/core';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { getAuth } from 'firebase-admin/auth';
import { MailerService } from '@nestjs-modules/mailer';


// key helpers, kept in one place so TTLs/prefixes can't drift between methods
const otpKey = (email: string) => `pwreset:otp:${email.toLowerCase()}`;
const tokenKey = (email: string) => `pwreset:token:${email.toLowerCase()}`;

const OTP_TTL_MS = 5 * 60 * 1000; // 5 min to enter the emailed OTP
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 min to complete the reset

function generateFourDigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
interface FirebaseAuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
}



@Injectable()
export class AuthService {
  private readonly apiKey: string;

  constructor(
    private config: ConfigService,
    private mailerService: MailerService,

    @InjectRepository(User) private usersRepo: Repository<User>,
    @Inject('FIREBASE_ADMIN') private firebaseApp: App,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,


  ) {
    this.apiKey = this.config.get<string>('FIREBASE_WEB_API_KEY')!;
  }
  private response(
    status_code: number,
    message_title: string,
    message_body: string,
    data: any = null,
  ) {
    return { status_code, message_title, message_body, data };
  }

  private generateCode(length: number = 4): string {
    return Math.floor(
      Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1),
    ).toString();
  }

  private resetOtpEmailTemplate(code: string): string {
    return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>إعادة تعيين كلمة المرور</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f6fb; color:#172033; font-family:Tahoma, Arial, sans-serif; direction:rtl;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      رمز التحقق الخاص بك هو ${code}، وينتهي خلال 5 دقائق.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f3f6fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:560px; background-color:#ffffff; border:1px solid #e6eaf0; border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(23,32,51,0.08);">
            <tr><td style="height:7px; background-color:#5b5ce2; font-size:0; line-height:0;">&nbsp;</td></tr>
            <tr>
              <td align="center" style="padding:40px 36px 18px;">
                <div style="width:64px; height:64px; line-height:64px; border-radius:18px; background-color:#eeeeff; color:#5b5ce2; font-size:30px; text-align:center;">&#128274;</div>
                <h1 style="margin:22px 0 10px; color:#172033; font-size:26px; line-height:1.4; font-weight:700;">إعادة تعيين كلمة المرور</h1>
                <p style="margin:0; color:#667085; font-size:16px; line-height:1.8;">استخدم رمز التحقق التالي لإكمال طلب إعادة تعيين كلمة المرور.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 36px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f7f7ff; border:1px solid #dedeff; border-radius:16px;">
                  <tr>
                    <td align="center" style="padding:22px 16px;">
                      <div style="color:#7778a3; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:1px;">رمز التحقق</div>
                      <div dir="ltr" style="margin-top:8px; color:#4b4ccc; font-family:Arial, sans-serif; font-size:38px; line-height:1.2; font-weight:800; letter-spacing:12px; text-indent:12px;">${code}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#fff8e7; border-radius:12px;">
                  <tr><td style="padding:14px 16px; color:#8a641b; font-size:14px; line-height:1.7; text-align:right;">&#9201;&#65039; هذا الرمز صالح لمدة <strong>5 دقائق</strong> ويُستخدم مرة واحدة فقط.</td></tr>
                </table>
                <p style="margin:22px 0 0; color:#667085; font-size:14px; line-height:1.8; text-align:center;">إذا لم تطلب تغيير كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. لا تشارك هذا الرمز مع أي شخص.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 28px; background-color:#fafbfc; border-top:1px solid #edf0f4; color:#98a2b3; font-size:12px; line-height:1.7;">أُرسلت هذه الرسالة تلقائياً لحماية حسابك، يرجى عدم الرد عليها.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
  // ================= Password recovery ACTIONS =================

  // Step 1: verify the email belongs to an account, email a 4-digit code
  async send_reset_mail(email: string) {
    const user = await this.usersRepo.findOneBy({ email });

    if (!user) {
      // Same generic response regardless — don't let this endpoint
      // become an email-enumeration oracle.
      return this.response(
        200,
        'تم الإرسال',
        'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق',
      );
    }

    const code = this.generateCode();

    await this.cacheManager.set(`reset:step1:${email}`, code, 1000 * 60 * 5); // 5 min

    await this.mailerService.sendMail({
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: this.resetOtpEmailTemplate(code),
    });

    return this.response(
      200,
      'تم الإرسال',
      'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق',
    );
  }

  // Step 2: check the code, issue a resetPassToken (also 4 digits)
  async validate_reset_mail(email: string, code: string) {
    const cachedCode = await this.cacheManager.get<string>(`reset:step1:${email}`);

    if (!cachedCode || cachedCode !== code) {
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    // single-use: burn it now that it's been checked
    await this.cacheManager.del(`reset:step1:${email}`);

    const resetPassToken = this.generateCode();

    await this.cacheManager.set(
      `reset:step2:${email}`,
      resetPassToken,
      1000 * 60 * 10, // 10 min
    );

    return this.response(
      200,
      'تم التحقق',
      'تم التحقق من الرمز بنجاح',
      { resetPassToken },
    );
  }

  // Step 3: verify resetPassToken, then actually reset the password via Firebase
  async reset_password(email: string, newPassword: string, resetPassToken: string) {
    const cachedToken = await this.cacheManager.get<string>(`reset:step2:${email}`);

    if (!cachedToken || cachedToken !== resetPassToken) {
      throw new BadRequestException('رمز إعادة التعيين غير صالح');
    }

    const user = await this.usersRepo.findOneBy({ email });
    if (!user) {
      throw new BadRequestException('المستخدم غير موجود');
    }

    await getAuth(this.firebaseApp).updateUser(user.firebaseUid, {
      password: newPassword,
    });

    // single-use
    await this.cacheManager.del(`reset:step2:${email}`);

    return this.response(200, 'تم التحديث', 'تم تغيير كلمة المرور بنجاح');
  }


  // ── Email/Password Sign Up ──────────────
  async register(email: string, password: string) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new BadRequestException(data.error?.message ?? 'Registration failed');
    return data as FirebaseAuthResponse;
  }

  // ── Email/Password Login ────────────────
  async login(email: string, password: string) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new UnauthorizedException(data.error?.message ?? 'Invalid credentials');
    return data as FirebaseAuthResponse;
  }

  // ── Google / Facebook (OAuth) Login ─────
  async loginWithIdp(provider: 'google.com' | 'facebook.com', idpToken: string, requestUri: string) {
    // idpToken = the access_token or id_token obtained from Google/Facebook's own SDK/OAuth flow
    const postBody =
      provider === 'google.com'
        ? `id_token=${idpToken}&providerId=google.com`
        : `access_token=${idpToken}&providerId=facebook.com`;

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody,
          requestUri, // e.g. your app's redirect URI, doesn't need to be real for this flow
          returnIdpCredential: true,
          returnSecureToken: true,
        }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new UnauthorizedException(data.error?.message ?? 'OAuth login failed');
    return data as FirebaseAuthResponse;
  }

  // ── Refresh an expired ID token ──────────
  async refreshToken(refreshToken: string) {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new UnauthorizedException('Could not refresh token');
    return data; // { id_token, refresh_token, expires_in, ... }
  }
}
