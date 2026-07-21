import { Inject, Injectable } from '@nestjs/common';
import { MailProvider } from './interfaces/mail-provider.interface';
import { MAIL_PROVIDER } from './mail.constants';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.provider.send({
      to,
      subject: 'Vérification de votre compte',
      html: `<p>Votre code de vérification : <strong>${code}</strong></p><p>Expire dans 15 minutes.</p>`,
      text: `Votre code de vérification : ${code}`,
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.provider.send({
      to,
      subject: 'Réinitialisation de mot de passe',
      html: `<p>Votre code de réinitialisation : <strong>${code}</strong></p><p>Expire dans 15 minutes.</p>`,
      text: `Votre code de réinitialisation : ${code}`,
    });
  }
}