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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('auth/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // Dashboard / KPIs
  // ============================================

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ============================================
  // User Management
  // ============================================

  @Get('users')
  async listUsers(
    @Query('statut') statut?: string,
    @Query('role') role?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listUsers({ statut, role, limit: +limit, offset: +offset });
  }

  @Get('users/:userId')
  async getUserDetails(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Patch('users/:userId')
  async updateUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('role') role?: string,
    @Body('statut') statut?: string,
    @Body('actifVendeur') actifVendeur?: boolean,
  ) {
    return this.adminService.updateUser(userId, { role, statut, actifVendeur });
  }

  @Post('users/:userId/suspend')
  async suspendUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('motif') motif?: string,
  ) {
    return this.adminService.suspendUser(userId, motif);
  }

  @Post('users/:userId/unsuspend')
  async unsuspendUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  // ============================================
  // Listing Moderation
  // ============================================

  @Get('listings')
  async listListings(
    @Query('type') type?: 'vente' | 'demande',
    @Query('statut') statut?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listListings({ type, statut, limit: +limit, offset: +offset });
  }

  @Post('listings/:id/suspend')
  async suspendListing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('type') type: 'vente' | 'demande',
  ) {
    return this.adminService.suspendListing(id, type);
  }

  @Post('listings/:id/unsuspend')
  async unsuspendListing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('type') type: 'vente' | 'demande',
  ) {
    return this.adminService.unsuspendListing(id, type);
  }

  @Delete('listings/:id')
  async deleteListing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('type') type: 'vente' | 'demande',
  ) {
    return this.adminService.deleteListing(id, type);
  }

  // ============================================
  // Order Management
  // ============================================

  @Get('orders')
  async listOrders(
    @Query('statut') statut?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listOrders({ statut, userId, limit: +limit, offset: +offset });
  }

  @Get('orders/:orderId')
  async getOrder(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.adminService.getOrder(orderId);
  }

  @Patch('orders/:orderId')
  async updateOrderStatus(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body('statut') statut: string,
    @Body('noteAdmin') noteAdmin?: string,
  ) {
    return this.adminService.updateOrderStatus(orderId, { statut, noteAdmin });
  }

  // ============================================
  // Dispute Management
  // ============================================

  @Get('litiges')
  async listDisputes(
    @Query('statut') statut?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listDisputes({ statut, limit: +limit, offset: +offset });
  }

  @Get('litiges/:disputeId')
  async getDispute(@Param('disputeId', new ParseUUIDPipe()) disputeId: string) {
    return this.adminService.getDispute(disputeId);
  }

  @Post('litiges/:disputeId/arbitrer')
  async arbitrateDispute(
    @Param('disputeId', new ParseUUIDPipe()) disputeId: string,
    @Body('decision') decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    @Body('montantRembourse') montantRembourse: number,
    @Body('noteAdmin') noteAdmin: string,
    @Body('adminId') adminId: string,
  ) {
    return this.adminService.arbitrateDispute(
      disputeId, decision, montantRembourse || 0, noteAdmin || '', adminId,
    );
  }

  // ============================================
  // Report Management
  // ============================================

  @Get('signalements')
  async listReports(
    @Query('statut') statut?: string,
    @Query('cibleType') cibleType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listReports({ statut, cibleType, limit: +limit, offset: +offset });
  }

  @Get('signalements/:reportId')
  async getReport(@Param('reportId', new ParseUUIDPipe()) reportId: string) {
    return this.adminService.getReport(reportId);
  }

  @Patch('signalements/:reportId')
  async actionReport(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body('statut') statut: string,
    @Body('decision') decision: string,
    @Body('noteAdmin') noteAdmin: string,
    @Body('adminId') adminId: string,
  ) {
    return this.adminService.actionReport(reportId, { statut, decision, noteAdmin }, adminId);
  }

  // ============================================
  // Quote Management
  // ============================================

  @Get('devis')
  async listQuotes(
    @Query('statut') statut?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listQuotes({ statut, limit: +limit, offset: +offset });
  }

  // ============================================
  // Imprimeur Management
  // ============================================

  @Get('imprimeurs')
  async listImprimeurs(
    @Query('actif') actif?: string,
    @Query('disponible') disponible?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.listImprimeurs({
      actif: actif ? actif === 'true' : undefined,
      disponible: disponible ? disponible === 'true' : undefined,
      limit: +limit,
      offset: +offset,
    });
  }

  @Post('imprimeurs/:userId/toggle-disponible')
  async toggleImprimeurDisponibilite(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('disponible') disponible: boolean,
  ) {
    return this.adminService.toggleImprimeurDisponibilite(userId, disponible);
  }
}
