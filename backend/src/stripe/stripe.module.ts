import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import type { Request as ExpressRequest, Response, NextFunction } from 'express';

// Local type for raw body requests
interface RawBodyRequest extends ExpressRequest {
  rawBody?: Buffer | string;
}

import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Raw body middleware — Stripe webhooks need the unparsed body
 * for signature verification. This middleware runs BEFORE the
 * Express JSON body parser, copying req.rawBody.
 */
function rawBodyMiddleware(req: RawBodyRequest, res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', (err: Error) => next(err));
}

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  imports: [PrismaModule],
  exports: [StripeService],
})
export class StripeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(rawBodyMiddleware).forRoutes('stripe/webhook');
  }
}
