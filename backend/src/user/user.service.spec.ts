import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock argon2 to avoid issues in tests
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked-argon2-hash'),
  argon2id: 0,
}));

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
    refreshToken: {
      updateMany: jest.fn(),
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
    commande: {
      findMany: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
    userBlock: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(undefined),
  };

  const mockGeocodingService = {
    geocode: jest.fn().mockResolvedValue({
      latitude: 48.8566,
      longitude: 2.3522,
      formattedAddress: 'Paris, France',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GeocodingService, useValue: mockGeocodingService },
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
        geom: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 4.5,
        nbAvis: 10,
        actifVendeur: true,
        emailVerifiedAt: null,
        cguVersionAcceptee: null,
        cguAccepteeAt: null,
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

      expect(result).toMatchObject(mockUser);
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
        geom: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        emailVerifiedAt: null,
        cguVersionAcceptee: null,
        cguAccepteeAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(result.nom).toBe('New Name');
      expect(result.prenom).toBe('New First');
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
        geom: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: true,
        emailVerifiedAt: null,
        cguVersionAcceptee: null,
        cguAccepteeAt: null,
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
  });

  describe('T-2.1: Geocoding integration', () => {
    it('should geocode address when updating profile with location', async () => {
      const userId = 'user-1';
      const updateDto = {
        localisation: { address: 'Paris, France' },
      };

      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
        localisation: { address: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
        geom: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        noteMoyenne: 0,
        nbAvis: 0,
        actifVendeur: false,
        emailVerifiedAt: null,
        cguVersionAcceptee: null,
        cguAccepteeAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(mockGeocodingService.geocode).toHaveBeenCalledWith('Paris, France');
      expect(result.localisation).toHaveProperty('latitude');
      expect(result.localisation).toHaveProperty('longitude');
    });
  });

  describe('T-2.5: Account deletion (anonymization)', () => {
    it('should anonymize user account instead of hard deleting', async () => {
      (mockPrismaService.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'deleted_xxxx@anonymized.local',
      });

      const result = await service.deleteAccount('user-1');

      expect(result.message).toContain('supprimé');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            nom: 'Utilisateur supprimé',
          }),
        }),
      );
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('T-2.6: Data export', () => {
    it('should export all user data', async () => {
      const userId = 'user-1';

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        typeCompte: 'particulier',
        avatar: null,
        localisation: null,
        noteMoyenne: 4.5,
        nbAvis: 10,
        actifVendeur: true,
        emailVerifiedAt: null,
        cguVersionAcceptee: '1.0',
        cguAccepteeAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (mockPrismaService.annonceVente.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.commande.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.conversation.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.avis.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.userBlock.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.exportUserData(userId);

      expect(result.profile.id).toBe(userId);
      expect(result.listings).toEqual([]);
      expect(result.orders).toEqual([]);
      expect(result.conversations).toEqual([]);
      expect(result.exportMetadata.userId).toBe(userId);
      expect(result.exportMetadata.exportedAt).toBeDefined();
    });
  });

  describe('T-2.7: CGU acceptance', () => {
    it('should accept CGU and store version', async () => {
      (mockPrismaService.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        cguVersionAcceptee: '1.0',
        cguAccepteeAt: new Date(),
      });

      const result = await service.acceptCGU('user-1', '1.0');

      expect(result.cguVersionAcceptee).toBe('1.0');
      expect(result.cguAccepteeAt).toBeDefined();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cguVersionAcceptee: '1.0',
          }),
        }),
      );
    });

    it('should return false for hasAcceptedCGU when not accepted', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        cguVersionAcceptee: null,
      });

      const result = await service.hasAcceptedCGU('user-1', '1.0');
      expect(result).toBe(false);
    });

    it('should return true for hasAcceptedCGU when accepted', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        cguVersionAcceptee: '1.0',
      });

      const result = await service.hasAcceptedCGU('user-1', '1.0');
      expect(result).toBe(true);
    });
  });

  describe('T-2.4: User blocking', () => {
    it('should block a user', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'blocked-user',
        email: 'blocked@example.com',
      });
      (mockPrismaService.userBlock.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaService.userBlock.create as jest.Mock).mockResolvedValue({
        blocked: { id: 'blocked-user', nom: 'Blocked', prenom: 'User', email: 'blocked@example.com' },
        createdAt: new Date(),
      });

      const result = await service.blockUser('user-1', {
        blockedId: 'blocked-user',
        reason: 'Spam',
      });

      expect(result.blocked.id).toBe('blocked-user');
      expect(mockPrismaService.userBlock.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when blocking yourself', async () => {
      await expect(
        service.blockUser('user-1', { blockedId: 'user-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when blocking non-existent user', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.blockUser('user-1', { blockedId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unblock a user', async () => {
      const existingBlock = { blockerId: 'user-1', blockedId: 'blocked-user' };
      (mockPrismaService.userBlock.findFirst as jest.Mock).mockResolvedValue(existingBlock);
      (mockPrismaService.userBlock.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.unblockUser('user-1', 'blocked-user');

      expect(result.message).toBe('User unblocked successfully');
      expect(mockPrismaService.userBlock.delete).toHaveBeenCalled();
    });

    it('should get blocked users list', async () => {
      (mockPrismaService.userBlock.findMany as jest.Mock).mockResolvedValue([
        {
          blocked: { id: 'blocked-1', nom: 'Blocked', prenom: 'User', email: 'blocked@example.com', avatar: null },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getBlockedUsers('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].nom).toBe('Blocked');
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
    });
  });

  describe('getSellerActiveListings', () => {
    it('should return active listings for a seller', async () => {
      const mockListings = [
        { id: 'listing-1', titre: 'Product 1', statut: 'ACTIVE' },
      ];

      (mockPrismaService.annonceVente.findMany as jest.Mock).mockResolvedValue(
        mockListings,
      );

      const result = await service.getSellerActiveListings('seller-1');

      expect(result).toEqual(mockListings);
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
    });
  });
});
