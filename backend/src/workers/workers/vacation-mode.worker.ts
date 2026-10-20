import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Processor('vacation-mode')
export class VacationModeWorker {
  private readonly logger = new Logger(VacationModeWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Process('vacation-check')
  async handleVacationCheck(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    const inactivityDays = this.configService.get('VACATION_INACTIVITY_DAYS') ?? 15;

    // Check last activity for this user (imprimeur)
    const lastActivity = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
      select: { derniereActiviteAt: true, disponible: true },
    });

    if (!lastActivity?.derniereActiviteAt) {
      return;
    }

    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivity.derniereActiviteAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceActivity >= inactivityDays && lastActivity.disponible) {
      // Auto-enable vacation mode
      await this.prisma.imprimeurProfil.update({
        where: { userId },
        data: {
          disponible: false,
          enPauseDepuis: new Date(),
          pauseOrigine: 'AUTO',
        },
      });

      // Set all active listings to 'en_pause'
      await this.prisma.annonceVente.updateMany({
        where: {
          vendeurId: userId,
          statut: 'ACTIVE',
        },
        data: { statut: 'EN_PAUSE' },
      });

      // TODO: Send notification to user at J+12 (before auto-activation)
      this.logger.log(`User ${userId} auto-entered vacation mode after ${daysSinceActivity} days of inactivity`);
    }
  }
}
