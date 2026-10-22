import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommandeService } from './commande.service';

@Controller('commandes')
@UseGuards(JwtAuthGuard)
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  // ============================================
  // Create order from accepted quote or listing
  // ============================================

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: any,
  ) {
    return this.commandeService.create(userId, createDto);
  }

  // ============================================
  // Get user's orders
  // ============================================

  @Get('my')
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query('role') role: 'acheteur' | 'vendeur' = 'acheteur',
    @Query('statut') statut?: string,
  ) {
    return this.commandeService.findByUser(userId, role, statut);
  }

  // ============================================
  // Get order by ID
  // ============================================

  @Get(':id')
  async getOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandeService.findById(id, userId);
  }

  // ============================================
  // Update order status
  // ============================================

  @Post(':id/confirm-payment')
  async confirmPayment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body('stripePaymentIntentId') stripePaymentIntentId: string,
  ) {
    return this.commandeService.confirmPayment(id, userId, stripePaymentIntentId);
  }

  @Post(':id/ship')
  async shipOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body('trackingInfo') trackingInfo: string,
  ) {
    return this.commandeService.shipOrder(id, userId, trackingInfo);
  }

  @Post(':id/confirm-receipt')
  async confirmReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandeService.confirmReceipt(id, userId);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body('motif') motif?: string,
  ) {
    return this.commandeService.cancelOrder(id, userId, motif);
  }

  // ============================================
  // Admin: Get all orders
  // ============================================

  @Get()
  @Roles('admin')
  async findAll(
    @Query('statut') statut?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.commandeService.findAll(statut, parsedLimit, parsedOffset);
  }
}
