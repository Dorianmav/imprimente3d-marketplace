import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { MAIL_PROVIDER } from './mail.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: MAIL_PROVIDER, useClass: NodemailerProvider },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}