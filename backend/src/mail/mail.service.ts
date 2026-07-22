import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailProvider } from './interfaces/mail-provider.interface';
import { MAIL_PROVIDER } from './mail.constants';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  private readonly frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:3000';

  async sendVerificationLink(to: string, token: string): Promise<void> {
    const link = `${process.env.APP_URL}/auth/verify-account/${token}`;
    await this.provider.send({
      to,
      subject: 'Vérification de votre compte',
      html: `<p><a href="${link}">Vérifier mon compte</a></p><p>Expire dans 15 minutes.</p>`,
      text: `Vérifier: ${link}`,
    });
  }

  async sendPasswordResetLink(to: string, token: string): Promise<void> {
    const link = `${process.env.APP_URL}/auth/reset-password/${token}`;
    await this.provider.send({
      to,
      subject: 'Réinitialisation de mot de passe',
      html: `<p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Expire dans 15 minutes.</p>`,
      text: `Réinitialiser: ${link}`,
    });
  }
}
