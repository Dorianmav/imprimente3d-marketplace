import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateImprimeurProfilDto } from './dto/create-imprimeur-profil.dto';
import { UpdateImprimeurProfilDto } from './dto/update-imprimeur-profil.dto';

@Injectable()
export class ImprimeurService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(userId: string, dto: CreateImprimeurProfilDto) {
    return this.prisma.imprimeurProfil.upsert({
      where: { userId },
      create: {
        userId,
        bio: dto.bio,
        imprimantes: dto.imprimantes as any,
        materiaux: dto.materiaux,
        zoneExpedition: dto.zoneExpedition,
        delaiMoyenJours: dto.delaiMoyenJours,
        tarifsIndicatifs: dto.tarifsIndicatifs ?? undefined,
        disponible: dto.disponible ?? true,
      },
      update: {
        bio: dto.bio,
        imprimantes: dto.imprimantes as any,
        materiaux: dto.materiaux,
        zoneExpedition: dto.zoneExpedition,
        delaiMoyenJours: dto.delaiMoyenJours,
        tarifsIndicatifs: dto.tarifsIndicatifs,
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.imprimeurProfil.findUnique({ where: { userId } });
  }

  async findPublic(userId: string) {
    const profil = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
            nbAvis: true,
          },
        },
      },
    });
    if (!profil) throw new NotFoundException();
    return profil;
  }

  async update(userId: string, dto: UpdateImprimeurProfilDto) {
    const existing = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });
    if (!existing)
      throw new NotFoundException('Aucun profil imprimeur existant.');

    return this.prisma.imprimeurProfil.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.imprimantes !== undefined
          ? { imprimantes: dto.imprimantes as any }
          : {}),
        ...(dto.materiaux !== undefined ? { materiaux: dto.materiaux } : {}),
        ...(dto.zoneExpedition !== undefined
          ? { zoneExpedition: dto.zoneExpedition }
          : {}),
        ...(dto.delaiMoyenJours !== undefined
          ? { delaiMoyenJours: dto.delaiMoyenJours }
          : {}),
        ...(dto.tarifsIndicatifs !== undefined
          ? { tarifsIndicatifs: dto.tarifsIndicatifs }
          : {}),
      },
    });
  }

  async toggleDisponible(userId: string, disponible: boolean) {
    const existing = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException();

    return this.prisma.imprimeurProfil.update({
      where: { userId },
      data: { disponible },
    });
  }

  async remove(userId: string) {
    const existing = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException();

    return this.prisma.imprimeurProfil.delete({ where: { userId } });
  }
}
