import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: (config: ConfigService) => {
    return new Stripe(config.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });
  },
  inject: [ConfigService],
};