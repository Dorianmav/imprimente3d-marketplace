import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    imprimeurProfil: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const defaults: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return defaults[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user and return tokens', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier' as const,
      };

      const mockUser = {
        id: 'user-1',
        email: signupDto.email,
        passwordHash: '$2b$12$...',
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: 'particulier',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.signup(signupDto);

      expect(result.user).toEqual({
        id: 'user-1',
        email: signupDto.email,
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: 'particulier',
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: signupDto.email,
            typeCompte: 'particulier',
          }),
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should default typeCompte to particulier', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      const mockUser = {
        id: 'user-1',
        email: signupDto.email,
        passwordHash: '$2b$12$...',
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: 'particulier',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.signup(signupDto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            typeCompte: 'particulier',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-1',
        email: loginDto.email,
        passwordHash: await bcrypt.hash('password123', 12),
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result.user).toEqual({
        id: 'user-1',
        email: loginDto.email,
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-1',
        email: loginDto.email,
        passwordHash: await bcrypt.hash('correctpassword', 12),
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens with valid refresh token', async () => {
      const userId = 'user-1';
      const refreshToken = 'valid-refresh-token';

      const mockUser = {
        id: userId,
        refreshToken: await bcrypt.hash(refreshToken, 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens(userId, refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException if user has no refresh token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        refreshToken: null,
      });

      await expect(
        service.refreshTokens('user-1', 'any-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        refreshToken: await bcrypt.hash('different-token', 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.refreshTokens('user-1', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear the refresh token', async () => {
      await service.logout('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile with imprimeur info', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
        avatar: null,
        avatarUrl: null,
        localisation: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        ...mockUser,
        imprimeurProfil: null,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include imprimeur profile when available', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
        avatar: null,
        avatarUrl: null,
        localisation: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 4.5,
        nbAvis: 10,
        actifVendeur: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockImprimeur = {
        bio: '3D printing expert',
        imprimantes: [],
        materiaux: [],
        localisation: {},
        zoneExpedition: null,
        delaiMoyenJours: 7,
        tarifsIndicatifs: {},
        disponible: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(
        mockImprimeur,
      );

      const result = await service.getProfile(userId);

      expect(result.imprimeurProfil).toEqual(mockImprimeur);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'user-1';
      const updateDto = {
        nom: 'Updated Name',
        prenom: 'Updated First',
      };

      const mockUpdatedUser = {
        id: userId,
        ...updateDto,
        email: 'test@example.com',
        typeCompte: 'particulier',
        avatar: null,
        avatarUrl: null,
        localisation: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(result.nom).toBe('Updated Name');
      expect(result.prenom).toBe('Updated First');
    });

    it('should throw ConflictException if email already in use', async () => {
      const userId = 'user-1';
      const updateDto = { email: 'taken@example.com' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'other-user',
        email: updateDto.email,
      });

      await expect(
        service.updateProfile(userId, updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow keeping the same email', async () => {
      const userId = 'user-1';
      const updateDto = { email: 'same@example.com' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: updateDto.email,
      });

      const mockUpdatedUser = {
        id: userId,
        ...updateDto,
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier' as const,
        avatar: null,
        avatarUrl: null,
        localisation: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await expect(
        service.updateProfile(userId, updateDto),
      ).resolves.toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const userId = 'user-1';
      const currentPassword = 'currentPass123';
      const newPassword = 'newPass456';

      const mockUser = {
        id: userId,
        passwordHash: await bcrypt.hash(currentPassword, 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      expect(result.message).toBe('Password changed successfully');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'pass', 'newpass'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: await bcrypt.hash('correctPass', 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', 'wrongPass', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user data without password hash', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier' as const,
        avatar: null,
        localisation: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      // The select in validateUser excludes passwordHash; the type system enforces this.
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
