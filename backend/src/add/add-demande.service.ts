import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddDemandeDto } from './dto/create-add-demande.dto';
import { UpdateAddDemandeDto } from './dto/update-add-demande.dto';

@Injectable()
export class AddDemandeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(acheteurId: string, dto: CreateAddDemandeDto) {
    const dateExpiration = new Date();
    dateExpiration.setDate(dateExpiration.getDate() + 15);

    return this.prisma.annonceDemande.create({
      data: { ...dto, acheteurId, dateExpiration },
    });
  }

  async findAllOuvertes() {
    return this.prisma.annonceDemande.findMany({
      where: { statut: 'OUVERTE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublic(id: string) {
    const add = await this.prisma.annonceDemande.findUnique({
      where: { id },
      include: { devis: true },
    });

    if (!add || add.statut === 'CLOTUREE' || add.statut === 'ANNULEE') {
      throw new NotFoundException();
    }

    return add;
  }

  async update(id: string, acheteurId: string, dto: UpdateAddDemandeDto) {
    const add = await this.prisma.annonceDemande.findUnique({ where: { id } });
    if (!add) throw new NotFoundException();
    if (add.acheteurId !== acheteurId) throw new ForbiddenException();

    return this.prisma.annonceDemande.update({
      where: { id },
      data: dto,
    });
  }

  async cancel(id: string, acheteurId: string) {
    const add = await this.prisma.annonceDemande.findUnique({ where: { id } });
    if (!add) throw new NotFoundException();
    if (add.acheteurId !== acheteurId) throw new ForbiddenException();

    return this.prisma.annonceDemande.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }
}