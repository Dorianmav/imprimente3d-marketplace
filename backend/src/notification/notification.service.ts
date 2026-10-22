import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/node';
import { NotificationApiService } from './notification-api.service';

export type NotificationEvent =
  | 'NEW_QUOTE'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REFUSED'
  | 'ORDER_PAID'
  | 'OFFER_RECEIVED'
  | 'COUNTER_OFFER_RECEIVED'
  | 'OFFER_EXPIRED'
  | 'NEW_MESSAGE'
  | 'DELIVERY_CONFIRMATION_PENDING'
  | 'FUNDS_RELEASE_IMMINENT'
  | 'REVIEW_RECEIVED'
  | 'REPORT_ACKNOWLEDGED'
  // CDC §10.2: shipping reminder J-2
  | 'SHIPPING_REMINDER'
  // Demand / request expiration
  | 'DEMAND_EXPIRING'
  | 'DEMAND_EXPIRED'
  // Review deposit reminder
  | 'REVIEW_REMINDER'
  // Dispute lifecycle
  | 'DISPUTE_OPENED'
  | 'DISPUTE_CLOSED'
  | 'DISPUTE_ESCALATION';

export interface NotificationPayload {
  userId: string;
  event: NotificationEvent;
  data: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly novu: Novu | null;
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationApiService?: NotificationApiService,
  ) {
    const apiKey = this.configService.get<string>('NOVU_API_KEY');
    this.novu = apiKey ? new Novu(apiKey) : null;
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const { userId, event, data } = payload;

    const templateVariables = {
      userName: data.userName || '',
      itemName: data.itemName || '',
      amount: data.amount || '',
      message: data.message || '',
      actionUrl: data.actionUrl || this.configService.get('APP_URL', 'http://localhost:3000'),
      ...data,
    };

    // Send via Novu if configured
    if (this.novu) {
      try {
        await this.novu.trigger(event, {
          to: { subscriberId: userId },
          payload: templateVariables,
          overrides: {
            ...(data.email ? { email: { subject: data.emailSubject || event } } : {}),
            ...(data.push !== false ? { fcm: { title: data.pushTitle || event, body: data.pushBody || messageForEvent(event) } } : {}),
          } as any,
        });
        this.logger.debug(`Notification sent via Novu: ${event} to ${userId}`);
      } catch (error) {
        this.logger.error(`Novu notification failed: ${error.message}`, error.stack);
        // Fall through to logging only - non-blocking
      }
    } else {
      // Stub mode: log the notification payload
      this.logger.log(`[NOTIFICATION STUB] Event: ${event}, User: ${userId}, Data:`, JSON.stringify(templateVariables));
    }

    // Always push in-app notification (for the API)
    if (this.notificationApiService) {
      const vars = templateVariables as Record<string, unknown>;
      await this.notificationApiService.pushNotification({
        userId,
        event,
        title: (vars.pushTitle as string) || event,
        body: (vars.pushBody as string) || messageForEvent(event),
        data: vars,
      });
    }
  }

  async sendEmail(to: string, subject: string, payload: Record<string, any>): Promise<void> {
    if (this.novu) {
      try {
        await this.novu.trigger('global-email', {
          to: { subscriberId: to, email: to },
          payload: { subject, ...payload },
        });
        this.logger.debug(`Email sent to ${to}: ${subject}`);
      } catch (error) {
        this.logger.error(`Email failed: ${error.message}`, error.stack);
      }
    } else {
      this.logger.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}, Data:`, JSON.stringify(payload));
    }
  }

  async sendInAppNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    await this.sendNotification({
      userId,
      event: this.eventFromTitle(title),
      data: { ...data, pushTitle: title, pushBody: body },
    });
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    await this.sendNotification({
      userId,
      event: this.eventFromTitle(title),
      data: { ...data, pushTitle: title, pushBody: body, push: true },
    });
  }

  private eventFromTitle(title: string): NotificationEvent {
    const map: Record<string, NotificationEvent> = {
      'Nouveau devis': 'NEW_QUOTE',
      'Devis accepté': 'QUOTE_ACCEPTED',
      'Devis refusé': 'QUOTE_REFUSED',
      'Commande payée': 'ORDER_PAID',
      'Offre reçue': 'OFFER_RECEIVED',
      'Contre-offre': 'COUNTER_OFFER_RECEIVED',
      'Offre expirée': 'OFFER_EXPIRED',
      'Nouveau message': 'NEW_MESSAGE',
      'Confirmation réception': 'DELIVERY_CONFIRMATION_PENDING',
      'Libération fonds': 'FUNDS_RELEASE_IMMINENT',
      'Avis reçu': 'REVIEW_RECEIVED',
      'Signalement': 'REPORT_ACKNOWLEDGED',
      'Rappel expédition J-2': 'SHIPPING_REMINDER',
      'Demande en expiration': 'DEMAND_EXPIRING',
      'Demande expirée': 'DEMAND_EXPIRED',
      'Rappel avis': 'REVIEW_REMINDER',
      'Litige ouvert': 'DISPUTE_OPENED',
      'Litige clos': 'DISPUTE_CLOSED',
      'Escalade litige': 'DISPUTE_ESCALATION',
    };
    return map[title] || 'NEW_MESSAGE';
  }
}

function messageForEvent(event: NotificationEvent): string {
  const messages: Record<NotificationEvent, string> = {
    NEW_QUOTE: 'Un nouveau devis a été soumis pour votre demande',
    QUOTE_ACCEPTED: 'Votre devis a été accepté !',
    QUOTE_REFUSED: 'Votre devis a été refusé',
    ORDER_PAID: 'Votre commande a été payée',
    OFFER_RECEIVED: 'Vous avez reçu une offre dans la messagerie',
    COUNTER_OFFER_RECEIVED: 'Vous avez reçu une contre-offre',
    OFFER_EXPIRED: 'Votre offre a expiré',
    NEW_MESSAGE: 'Vous avez un nouveau message',
    DELIVERY_CONFIRMATION_PENDING: 'Confirmez la réception de votre commande',
    FUNDS_RELEASE_IMMINENT: 'Les fonds seront bientôt libérés',
    REVIEW_RECEIVED: 'Vous avez reçu un avis',
    REPORT_ACKNOWLEDGED: 'Votre signalement a été pris en charge',
    SHIPPING_REMINDER: 'Expédition dans 2 jours — n\'oubliez pas d\'expédier',
    DEMAND_EXPIRING: 'Votre demande expire bientôt',
    DEMAND_EXPIRED: 'Votre demande a expiré',
    REVIEW_REMINDER: 'N\'oubliez pas de déposer un avis',
    DISPUTE_OPENED: 'Un litige a été ouvert sur votre commande',
    DISPUTE_CLOSED: 'Votre litige a été tranché',
    DISPUTE_ESCALATION: 'Délai de réponse vendeur expiré — escalation litige',
  };
  return messages[event] || 'Notification';
}
