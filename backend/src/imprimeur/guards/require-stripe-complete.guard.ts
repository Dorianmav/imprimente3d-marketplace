import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RequireStripeCompleteGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeOnboardingComplete) {
      throw new ForbiddenException('Finalisez d\'abord votre compte Stripe.');
    }

    return true;
  }
}