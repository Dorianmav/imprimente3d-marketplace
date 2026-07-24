import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailProvider } from './interfaces/mail-provider.interface';
import { MAIL_PROVIDER } from './mail.constants';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  private readonly frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:3000';

  private readonly appName = process.env.APP_NAME || 'MonApp';

  async sendVerificationLink(to: string, token: string): Promise<void> {
    const link = `${process.env.APP_URL}/auth/verify-account/${token}`;

    const html = this.buildEmailHtml({
      preheader: 'Confirmez votre adresse email pour activer votre compte.',
      title: 'Vérifiez votre adresse email',
      intro: `Merci de vous être inscrit sur ${this.appName}. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.`,
      buttonLabel: 'Vérifier mon compte',
      link,
      expiryMinutes: 15,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.",
    });

    const text = [
      `Vérifiez votre adresse email - ${this.appName}`,
      '',
      `Confirmez votre compte en ouvrant ce lien : ${link}`,
      '',
      'Ce lien expire dans 15 minutes.',
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
    ].join('\n');

    await this.provider.send({
      to,
      subject: `Vérifiez votre adresse email - ${this.appName}`,
      html,
      text,
    });
  }

  async sendPasswordResetLink(to: string, token: string): Promise<void> {
    const link = `${process.env.APP_URL}/auth/reset-password/${token}`;

    const html = this.buildEmailHtml({
      preheader: 'Réinitialisez votre mot de passe.',
      title: 'Réinitialisation de mot de passe',
      intro:
        'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
      buttonLabel: 'Réinitialiser mon mot de passe',
      link,
      expiryMinutes: 15,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email : votre mot de passe restera inchangé.",
    });

    const text = [
      `Réinitialisation de mot de passe - ${this.appName}`,
      '',
      `Choisissez un nouveau mot de passe via ce lien : ${link}`,
      '',
      'Ce lien expire dans 15 minutes.',
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    ].join('\n');

    await this.provider.send({
      to,
      subject: `Réinitialisation de mot de passe - ${this.appName}`,
      html,
      text,
    });
  }

  private buildEmailHtml(params: {
    preheader: string;
    title: string;
    intro: string;
    buttonLabel: string;
    link: string;
    expiryMinutes: number;
    footerNote: string;
  }): string {
    const { preheader, title, intro, buttonLabel, link, expiryMinutes, footerNote } =
      params;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- Preheader (masqué, visible dans l'aperçu de la boîte mail) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:24px 32px; border-bottom:1px solid #eeeeee;">
              <span style="font-size:18px; font-weight:600; color:#111827;">${this.appName}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">${title}</h1>
              <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#4b5563;">
                ${intro}
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px; background-color:#2563eb;">
                    <a href="${link}" target="_blank"
                       style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:6px;">
                      ${buttonLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                Ce lien expire dans ${expiryMinutes} minutes. Si le bouton ne fonctionne pas, copiez-collez cette adresse dans votre navigateur :
              </p>
              <p style="margin:8px 0 0; font-size:13px; word-break:break-all;">
                <a href="${link}" style="color:#2563eb; text-decoration:underline;">${link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; background-color:#f9fafb; border-top:1px solid #eeeeee;">
              <p style="margin:0; font-size:12px; line-height:1.5; color:#9ca3af;">
                ${footerNote}
              </p>
              <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">
                &copy; ${new Date().getFullYear()} ${this.appName}. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}