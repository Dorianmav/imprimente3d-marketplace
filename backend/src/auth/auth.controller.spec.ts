import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signup: jest.fn().mockResolvedValue({
              user: { id: '1', email: 'test@test.com', nom: 'Doe', prenom: 'John', typeCompte: 'particulier', emailVerifiedAt: null },
              accessToken: 'access_token',
              refreshToken: 'refresh_token',
            }),
            login: jest.fn().mockResolvedValue({
              user: { id: '1', email: 'test@test.com', nom: 'Doe', prenom: 'John', typeCompte: 'particulier', emailVerifiedAt: null },
              accessToken: 'access_token',
              refreshToken: 'refresh_token',
            }),
            refreshTokens: jest.fn().mockResolvedValue({
              accessToken: 'new_access_token',
              refreshToken: 'new_refresh_token',
            }),
            logout: jest.fn().mockResolvedValue(undefined),
            getProfile: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
            updateProfile: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
            changePassword: jest.fn().mockResolvedValue({ message: 'Password changed' }),
            requestPasswordReset: jest.fn().mockResolvedValue(undefined),
            resetPassword: jest.fn().mockResolvedValue(undefined),
            verifyEmail: jest.fn().mockResolvedValue(undefined),
            requestEmailVerification: jest.fn().mockResolvedValue(undefined),
            oauthCallback: jest.fn().mockResolvedValue({
              user: { id: '1', email: 'oauth@test.com', nom: 'OAuth', prenom: 'User', typeCompte: 'particulier', emailVerifiedAt: new Date() },
              accessToken: 'access_token',
              refreshToken: 'refresh_token',
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should register a new user', async () => {
      const result = await controller.signup({
        email: 'test@test.com',
        password: 'Password123!',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
      } as any);

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('access_token');
    });
  });

  describe('login', () => {
    it('should login an existing user', async () => {
      const result = await controller.login({
        email: 'test@test.com',
        password: 'Password123!',
      } as any);

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('access_token');
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const result = await controller.refresh(
        { refreshToken: 'old_refresh_token' },
        'user-1',
        {} as any,
      );

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });
  });

  describe('rate limiting decorators', () => {
    it('should have ThrottlerLimit metadata on signup', () => {
      const limit = Reflect.getMetadata('__restrict__', controller.signup, 'signup');
      // The RateLimitAuth decorator sets ThrottlerLimit to '5'
      expect(limit).toBeDefined();
    });

    it('should apply stricter limits to auth endpoints', () => {
      // Verify that the rate limit decorators are applied
      // RateLimitAuth sets limit to 5 requests per 300 seconds (5 min)
      const ttl = Reflect.getMetadata('throttler:ttl', controller.login, 'login');
      expect(ttl).toBeDefined();
      // RateLimitAuth uses ThrottlerTtl of 300 (5 minutes)
      expect(Number(ttl)).toBe(300);
    });
  });
});
