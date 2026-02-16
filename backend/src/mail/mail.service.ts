import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';

    if (!host || !user || !pass) {
      this.transporter = null;
      this.logger.warn(
        'SMTP chưa được cấu hình đầy đủ, email reset password sẽ bị bỏ qua.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendResetPasswordEmail(params: {
    to: string;
    resetUrl: string;
  }): Promise<void> {
    if (!this.transporter) return;
    const from =
      this.config.get<string>('SMTP_FROM') ?? 'no-reply@tts.local';

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: '[TTS] Dat lai mat khau',
      text: `Ban da yeu cau dat lai mat khau cho tai khoan dich vu TTS.\n\nMo lien ket sau de dat lai mat khau:\n${params.resetUrl}\n\nNeu ban khong thuc hien yeu cau nay, vui long bo qua email.`,
      html: `
        <p>Ban da yeu cau dat lai mat khau cho tai khoan dich vu TTS.</p>
        <p>Mo lien ket sau de dat lai mat khau:</p>
        <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
        <p>Neu ban khong thuc hien yeu cau nay, vui long bo qua email.</p>
      `,
    });
  }
}

