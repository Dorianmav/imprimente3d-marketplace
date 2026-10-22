import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VenteService } from './vente.service';

@Controller('ventes')
@UseGuards(JwtAuthGuard)
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  // ============================================
  // T-4.1: Create sale listing
  // ============================================

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createVenteDto: any,
  ) {
    return this.venteService.create(userId, createVenteDto);
  }

  // ============================================
  // T-4.2: Get sale listing by ID
  // ============================================

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const vente = await this.venteService.findById(id);
    // Remove sensitive/internal fields from public view
    const { photos, ...publicVente } = vente;
    return publicVente;
  }

  // ============================================
  // T-4.3: Get seller's listings
  // ============================================

  @Get('seller/:sellerId')
  async findBySeller(
    @Param('sellerId', new ParseUUIDPipe()) sellerId: string,
    @Query('statut') statut?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.venteService.findBySeller(
      sellerId,
      statut || 'ACTIVE',
      parsedLimit,
      parsedOffset,
    );
  }

  // ============================================
  // T-4.4: Update sale listing
  // ============================================

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body() updateVenteDto: any,
  ) {
    return this.venteService.update(id, userId, updateVenteDto);
  }

  // ============================================
  // T-4.5: Delete / archive sale listing
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.venteService.remove(id, userId);
  }

  // ============================================
  // T-4.6: List active listings (public)
  // ============================================

  @Get()
  async findAll(
    @Query('categorie') categorie?: string,
    @Query('materiau') materiau?: string,
    @Query('tri') tri?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.venteService.findAll({
      categorie,
      materiau,
      tri: tri || 'recent',
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }
}
