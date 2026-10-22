import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkersModule } from './workers/workers.module';
import { AuthGuard } from './auth/auth.guard';
import { LitigeModule } from './litige/litige.module';
import { VenteModule } from './vente/vente.module';
import { CommandeModule } from './commande/commande.module';
import { DemandeModule } from './demande/demande.module';
import { DevisModule } from './devis/devis.module';
import { MessagingModule } from './messaging/messaging.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { StripeModule } from './stripe/stripe.module';
import { AvisModule } from './avis/avis.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          limit: Number(configService.get('RATE_LIMIT_MAX', '10')),
          ttl: Number(configService.get('RATE_LIMIT_TTL', '60000')),
        }],
      }),
    }),
    AuthModule,
    UserModule,
    AdminModule,
    NotificationModule,
    PrismaModule,
    WorkersModule,
    VenteModule,
    CommandeModule,
    DemandeModule,
    DevisModule,
    LitigeModule,
    MessagingModule,
    SearchModule,
    StorageModule,
    StripeModule,
    AvisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthGuard],
})
export class AppModule {}
