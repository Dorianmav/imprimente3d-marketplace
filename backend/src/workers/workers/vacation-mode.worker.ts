import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Vacation mode worker (CDC §5)
 *
 * After VACATION_INACTIVITY_DAYS (15) days without activity:
 * - imprimeur passe en pause automatique
 * - disponibles = false
 * - pause_origine = auto
 * - annonces actives → en_pause
 *
 * Activity includes: sent message, submitted quote, order update, listing edit, manual availability toggle.
 * Simple login or reading doesn't count.
 *
 * Notification at J+12 before auto-activation.
 */
@Processor('vacation-mode')
export class VacationModeWorker extends WorkerHost {
  private readonly logger = new Logger(VacationModeWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'vacation-reminder') {
      return this.handleVacationReminder(job);
    }
    if (job.name === 'vacation-activate') {
      return this.handleVacationActivate(job);
    }
  }

  /**
   * J+12 reminder: notify imprimeur approaching auto-pause
   */
  async handleVacationReminder(job: Job<{ imprimeurId: string }>) {
    const { imprimeurId } = job.data;

    const imprimeur = await this.prisma.imprimeurProfil.findUnique({
      where: { userId: imprimeurId },
      include: { user: true },
    });

    if (!imprimeur || imprimeur.enPauseDepuis === null) {
      return;
    }

    await this.notificationService.sendNotification({
      userId: imprimeurId,
      event: 'NEW_MESSAGE',
      data: {
        message: `Mode vacances imminent: après 15 jours d'inactivité, votre profil sera mis en pause.`,
        pushTitle: 'Mode vacances imminent',
        pushBody: 'Dans 3 jours, votre profil sera en pause automatique.',
      },
    });

    this.logger.log(`Vacation reminder sent for imprimeur ${imprimeurId}`);
  }

  /**
   * Auto-activate vacation mode
   */
  async handleVacationActivate(job: Job<{ imprimeurId: string }>) {
    const { imprimeurId } = job.data;

    const imprimeur = await this.prisma.imprimeurProfil.findUnique({
      where: { userId: imprimeurId },
      include: { user: true },
    });

    if (!imprimeur) {
      return;
    }

    // Don't activate if already paused (manual or stripe)
    if (imprimeur.enPauseDepuis) {
      this.logger.debug(`Imprimeur ${imprimeurId} already paused, skipping auto-activate`);
      return;
    }

    // Activate auto-pause
    const now = new Date();
    await this.prisma.imprimeurProfil.update({
      where: { userId: imprimeurId },
      data: {
        disponible: false,
        enPauseDepuis: now,
        pauseOrigine: 'AUTO',
      },
    });

    // Pause all active listings
    await this.prisma.annonceVente.updateMany({
      where: {
        vendeurId: imprimeurId,
        statut: 'ACTIVE',
      },
      data: { statut: 'EN_PAUSE' },
    });

    // Notify imprimeur
    await this.notificationService.sendNotification({
      userId: imprimeurId,
      event: 'QUOTE_ACCEPTED',
      data: {
        message: `Mode vacances activé automatiquement: 15 jours d'inactivité détectés.`,
        pushTitle: 'Mode vacances activé',
        pushBody: 'Votre profil et vos annonces sont en pause.',
      },
    });

    this.logger.log(`Vacation mode activated for imprimeur ${imprimeurId}`);
  }
}
