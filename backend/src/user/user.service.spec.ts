import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    imprimeurProfil: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    annonceVente: {
      findMany: jest.fn(),
    },
    avis: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
        noteMoyenne: 4.5,
        nbAvis: 10,
        actifVendeur: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockImprimeur = {
        bio: 'Expert 3D',
        imprimantes: [],
        materiaux: [],
        localisation: {},
        zoneExpedition: null,
        delaiMoyenJours: 7,
        tarifsIndicatifs: {},
        disponible: true,
      };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (mockPrismaService.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(
        mockImprimeur,
      );

      const result = await service.getProfile(userId);

      expect(result).toEqual({ ...mockUser, imprimeurProfil: mockImprimeur });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          typeCompte: true,
          avatar: true,
          avatarUrl: true,
          localisation: true,
          stripeCustomerId: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          noteMoyenne: true,
          nbAvis: true,
          actifVendeur: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null imprimeurProfil when not available', async () => {
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

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (mockPrismaService.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getProfile(userId);

      expect(result.imprimeurProfil).toBeNull();
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const userId = 'user-1';
      const updateDto = {
        nom: 'New Name',
        prenom: 'New First',
      };

      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        nom: 'New Name',
        prenom: 'New First',
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

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(result.nom).toBe('New Name');
      expect(result.prenom).toBe('New First');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ nom: 'New Name', prenom: 'New First' }),
        }),
      );
    });

    it('should create imprimeur profile when actifVendeur set to true', async () => {
      const userId = 'user-1';
      const updateDto = { actifVendeur: true };

      const mockUpdatedUser = {
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
        actifVendeur: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );
      (mockPrismaService.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrismaService.imprimeurProfil.create as jest.Mock).mockResolvedValue(
        {},
      );

      await service.updateProfile(userId, updateDto);

      expect(mockPrismaService.imprimeurProfil.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId, delaiMoyenJours: 7 }),
        }),
      );
    });

    it('should not create imprimeur profile if already exists', async () => {
      const userId = 'user-1';
      const updateDto = { actifVendeur: true };

      const mockUpdatedUser = {
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
        actifVendeur: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingProfil = { id: 'profil-1', userId };

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );
      (mockPrismaService.imprimeurProfil.findUnique as jest.Mock).mockResolvedValue(
        existingProfil,
      );

      await service.updateProfile(userId, updateDto);

      expect(mockPrismaService.imprimeurProfil.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already in use', async () => {
      const userId = 'user-1';
      const updateDto = { email: 'taken@example.com' };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
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

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: updateDto.email,
      });

      const mockUpdatedUser = {
        id: userId,
        email: updateDto.email,
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

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );

      await expect(
        service.updateProfile(userId, updateDto),
      ).resolves.toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('should return success message with user data', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await service.changePassword(
        userId,
        'currentPass',
        'newPass',
      );

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'pass', 'newpass'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('should delete the user account', async () => {
      (mockPrismaService.user.delete as jest.Mock).mockResolvedValue({
        id: 'user-1',
      });

      const result = await service.deleteAccount('user-1');

      expect(result.message).toBe('Account deleted successfully');
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('findAllUsers', () => {
    it('should return all users with total count', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          nom: 'Doe',
          prenom: 'John',
          typeCompte: 'particulier',
          avatar: null,
          localisation: null,
          stripeCustomerId: null,
          stripeAccountId: null,
          stripeOnboardingComplete: false,
          noteMoyenne: 4.5,
          nbAvis: 10,
          actifVendeur: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.user.findMany as jest.Mock).mockResolvedValue(
        mockUsers,
      );
      (mockPrismaService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAllUsers();

      expect(result.total).toBe(1);
      expect(result.users).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          typeCompte: true,
          avatar: true,
          localisation: true,
          stripeCustomerId: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          noteMoyenne: true,
          nbAvis: true,
          actifVendeur: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('searchUsers', () => {
    it('should return matching users excluding the current user', async () => {
      const query = 'john';
      const excludeUserId = 'user-1';
      const mockUsers = [
        {
          id: 'user-2',
          nom: 'Smith',
          prenom: 'John',
          email: 'john@example.com',
          avatar: null,
          noteMoyenne: 4.0,
        },
      ];

      (mockPrismaService.user.findMany as jest.Mock).mockResolvedValue(
        mockUsers,
      );

      const result = await service.searchUsers(query, excludeUserId);

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ id: { not: excludeUserId } }),
            ]),
          }),
          take: 10,
        }),
      );
    });

    it('should respect the limit parameter', async () => {
      const mockUsers = [];

      (mockPrismaService.user.findMany as jest.Mock).mockResolvedValue(
        mockUsers,
      );

      await service.searchUsers('test', 'user-1', 5);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getSellerActiveListings', () => {
    it('should return active listings for a seller', async () => {
      const mockListings = [
        { id: 'listing-1', titre: 'Product 1', statut: 'ACTIVE' },
        { id: 'listing-2', titre: 'Product 2', statut: 'ACTIVE' },
      ];

      (mockPrismaService.annonceVente.findMany as jest.Mock).mockResolvedValue(
        mockListings,
      );

      const result = await service.getSellerActiveListings('seller-1');

      expect(result).toEqual(mockListings);
      expect(
        mockPrismaService.annonceVente.findMany,
      ).toHaveBeenCalledWith({
        where: { vendeurId: 'seller-1', statut: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getReceivedReviews', () => {
    it('should return reviews received by the user', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          note: 5,
          commentaire: 'Great service!',
          auteur: {
            id: 'user-2',
            nom: 'Smith',
            prenom: 'John',
            avatar: null,
          },
          createdAt: new Date(),
        },
      ];

      (mockPrismaService.avis.findMany as jest.Mock).mockResolvedValue(
        mockReviews,
      );

      const result = await service.getReceivedReviews('user-1');

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.avis.findMany).toHaveBeenCalledWith({
        where: { cibleId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          note: true,
          commentaire: true,
          createdAt: true,
          auteur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              avatar: true,
            },
          },
        },
      });
    });
  });
});
