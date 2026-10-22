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
import { DemandeService } from './demande.service';

@Controller('demandes')
@UseGuards(JwtAuthGuard)
export class DemandeController {
  constructor(private readonly demandeService: DemandeService) {}

  // ============================================
  // T-5.1: Create request listing
  // ============================================

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: any,
  ) {
    return this.demandeService.create(userId, createDto);
  }

  // ============================================
  // T-5.2: Get request by ID
  // ============================================

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.demandeService.findById(id);
  }

  // ============================================
  // T-5.3: Get buyer's requests
  // ============================================

  @Get('buyer/:buyerId')
  async findByBuyer(
    @Param('buyerId', new ParseUUIDPipe()) buyerId: string,
    @Query('statut') statut?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.demandeService.findByBuyer(
      buyerId,
      statut,
      parsedLimit,
      parsedOffset,
    );
  }

  // ============================================
  // T-5.4: Update request (owner only)
  // ============================================

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: any,
  ) {
    return this.demandeService.update(id, userId, updateDto);
  }

  // ============================================
  // T-5.5: Delete request (owner only)
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.demandeService.remove(id, userId);
  }

  // ============================================
  // T-5.6: List open requests (public, for sellers/imprimeurs)
  // ============================================

  @Get()
  async findAll(
    @Query('materiau') materiau?: string,
    @Query('tri') tri?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.demandeService.findAll({
      materiau,
      tri: tri || 'recent',
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  // ============================================
  // T-5.7: Search requests (pg_trgm fuzzy matching)
  // ============================================

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('materiau') materiau?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.demandeService.search(query, materiau, parsedLimit);
  }
}
