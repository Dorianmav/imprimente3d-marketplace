import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddVenteDto } from './dto/create-add-vente.dto';
import { UpdateAddVenteDto } from './dto/update-add-vente.dto';
import { ModeLivraison } from 'src/generated/prisma/client';

@Injectable()
export class AddVenteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(vendeurId: string, dto: CreateAddVenteDto) {
    const fraisLivraison =
      dto.modeLivraison === ModeLivraison.MAIN_PROPRE ? 0 : dto.fraisLivraison;

    return this.prisma.annonceVente.create({
      data: { ...dto, fraisLivraison, vendeurId },
    });
  }

  async findAllActive() {
    return this.prisma.annonceVente.findMany({
      where: { statut: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublic(id: string) {
    const add = await this.prisma.annonceVente.findUnique({
      where: { id },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true, avatar: true } },
      },
    });

    if (!add || add.statut === 'SUSPENDUE' || add.statut === 'ARCHIVEE') {
      throw new NotFoundException();
    }

    return add;
  }

  async update(id: string, vendeurId: string, dto: UpdateAddVenteDto) {
    const add = await this.prisma.annonceVente.findUnique({ where: { id } });
    if (!add) throw new NotFoundException();
    if (add.vendeurId !== vendeurId) throw new ForbiddenException();

    const fraisLivraison =
      dto.modeLivraison === ModeLivraison.MAIN_PROPRE
        ? 0
        : (dto.fraisLivraison ?? add.fraisLivraison);

    return this.prisma.annonceVente.update({
      where: { id },
      data: { ...dto, fraisLivraison },
    });
  }

  async archive(id: string, vendeurId: string) {
    const add = await this.prisma.annonceVente.findUnique({ where: { id } });
    if (!add) throw new NotFoundException();
    if (add.vendeurId !== vendeurId) throw new ForbiddenException();

    return this.prisma.annonceVente.update({
      where: { id },
      data: { statut: 'ARCHIVEE' },
    });
  }
}