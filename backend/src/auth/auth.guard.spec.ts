import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('isPublic', () => {
    it('should allow access to public routes', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: 'Bearer fake' } }),
        }),
      } as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('token validation', () => {
    it('should throw UnauthorizedException when no token is provided', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: 'Bearer invalid_token' } }),
        }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access with valid token', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-123', role: 'particulier' });

      const req = { headers: { authorization: 'Bearer valid_token' }, user: undefined };
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(req.user).toEqual({ sub: 'user-123', role: 'particulier' });
    });
  });

  describe('role checking (T-1.7)', () => {
    it('should allow access when user has required role', async () => {
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(['admin']); // ROLES_KEY

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'admin-1', role: 'admin' });

      const req = { headers: { authorization: 'Bearer admin_token' }, user: undefined };
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(['admin']); // ROLES_KEY

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', role: 'particulier' });

      const req = { headers: { authorization: 'Bearer user_token' }, user: undefined };
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow multiple roles', async () => {
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(['admin', 'vendeur']); // ROLES_KEY

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'seller-1', role: 'vendeur' });

      const req = { headers: { authorization: 'Bearer seller_token' }, user: undefined };
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should default to particulier role when not specified in token', async () => {
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(['particulier']); // ROLES_KEY

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' }); // no role

      const req = { headers: { authorization: 'Bearer token' }, user: undefined };
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
