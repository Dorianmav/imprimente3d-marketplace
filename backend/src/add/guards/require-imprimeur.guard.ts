import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RequireImprimeurGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { imprimeurProfil: true },
    });

    if (!user?.imprimeurProfil) {
      throw new ForbiddenException('Profil imprimeur requis.');
    }
    if (!user.stripeOnboardingComplete) {
      throw new ForbiddenException('Compte Stripe non finalisé.');
    }

    return true;
  }
}