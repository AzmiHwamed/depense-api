import { Injectable, Logger } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly mailer: NestMailerService) {}

  async sendResetCode(email: string, code: string) {
    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'إعادة تعيين كلمة المرور',
        html: this.resetTemplate(code),
      });
    } catch (error) {
      this.logger.error(`Failed to send reset code to ${email}:`, error);
      throw new Error('فشل في إرسال البريد الإلكتروني');
    }
  }

  /**
   * 📧 Send validity expiry warning email
   * @param email - User's email address
   * @param userName - Account user's name
   * @param accountName - Main account name
   * @param daysLeft - Days remaining before expiry (7 or 14)
   */
  async sendValidityExpiryWarning(
    email: string,
    userName: string,
    accountName: string,
    daysLeft: number,
  ) {
    try {
      const subject = `تنبيه: حسابك سينتهي في ${daysLeft} يوم`;
      
      await this.mailer.sendMail({
        to: email,
        subject,
        html: this.validityExpiryTemplate(userName, accountName, daysLeft),
      });

      this.logger.log(
        `✅ Sent ${daysLeft}-day expiry warning to ${email} for account ${accountName}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send validity expiry warning to ${email}:`,
        error
      );
      throw new Error('فشل في إرسال البريد الإلكتروني');
    }
  }

  // ================= TEMPLATES =================

  private resetTemplate(code: string): string {
    return `
      <div style="font-family: Arial; text-align: center; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333;">إعادة تعيين كلمة المرور</h2>
          <p style="color: #666; font-size: 16px;">رمز التحقق الخاص بك هو:</p>
          <h1 style="letter-spacing: 5px; color: #007bff; font-size: 32px; margin: 20px 0;">${code}</h1>
          <p style="color: #999; font-size: 14px;">هذا الرمز صالح لمدة محدودة</p>
        </div>
      </div>
    `;
  }

  /**
   * 📧 Email template for validity expiry warning
   */
  private validityExpiryTemplate(
    userName: string,
    accountName: string,
    daysLeft: number,
  ): string {
    const urgencyColor = daysLeft <= 7 ? '#dc3545' : '#ff9800'; // Red for 1 week, Orange for 2 weeks
    const urgencyText = daysLeft <= 7 ? 'عاجل' : 'تنبيه';

    return `
      <div style="font-family: Arial; text-align: right; background-color: #f5f5f5; padding: 20px; direction: rtl;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; max-width: 600px; margin: 0 auto; border-right: 4px solid ${urgencyColor};">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              ${urgencyText}
            </span>
          </div>

          <h2 style="color: #333; text-align: center;">تنبيه انتهاء صلاحية الحساب</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            السيد/السيدة <strong>${userName}</strong>,
          </p>

          <div style="background-color: #f9f9f9; border-right: 3px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 16px; margin: 10px 0;">
              نود إبلاغك بأن صلاحية حسابك في منصة <strong>${accountName}</strong> ستنتهي في خلال <strong style="color: ${urgencyColor};">${daysLeft} يوم</strong>.
            </p>
          </div>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            يرجى التواصل مع فريق الدعم الخاص بنا قبل انتهاء الصلاحية لتجديد حسابك وتجنب فقدان الوصول إلى الخدمات.
          </p>

          <div style="background-color: #e8f4f8; border-right: 3px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 14px; margin: 5px 0;">
              📅 <strong>تاريخ انتهاء الصلاحية:</strong> سيتم حسابه بناءً على آخر تحديث للحساب
            </p>
            <p style="color: #333; font-size: 14px; margin: 5px 0;">
              💬 <strong>للمزيد من المعلومات:</strong> يرجى التواصل مع دعم العملاء الخاص بنا
            </p>
          </div>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            شكراً لاستخدامك خدماتنا، ونتطلع إلى تجديد تعاونك معنا.
          </p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              هذا البريد من نظام إدارة المنصة الآلي
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              © جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    `;
  }
}