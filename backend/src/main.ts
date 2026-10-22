import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Security headers (CDC §15.1)
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  }));

  // Parse cookies
  app.use(cookieParser());

  // CSRF protection via SameSite=strict cookies (CDC §15.1)
  // JWT cookies are set with httpOnly, Secure, SameSite=strict in auth controller
  // This provides strong CSRF protection for web. Mobile (Capacitor) uses secure storage.
  app.use((req, res, next) => {
    // Skip for websocket upgrades, Stripe webhooks, and health checks
    if (req.headers['upgrade'] === 'websocket') return next();
    if (req.url === '/stripe/webhook') return next();
    if (req.url === '/favicon.ico') return next();
    next();
  });

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Trust proxy for rate limiting behind Traefik
  app.getHttpServer().set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
