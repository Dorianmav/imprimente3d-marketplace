import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ImprimeurService } from './imprimeur.service';
import { CreateImprimeurProfilDto } from './dto/create-imprimeur-profil.dto';
import { UpdateImprimeurProfilDto } from './dto/update-imprimeur-profil.dto';
import { RequireStripeCompleteGuard } from './guards/require-stripe-complete.guard';

@Controller('imprimeur-profil')
export class ImprimeurController {
  constructor(private readonly imprimeurService: ImprimeurService) {}

  @UseGuards(AuthGuard('jwt'), RequireStripeCompleteGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateImprimeurProfilDto) {
    return this.imprimeurService.createOrUpdate(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findMine(@Req() req: any) {
    return this.imprimeurService.findByUser(req.user.id);
  }

  @Get(':userId')
  findPublic(@Param('userId') userId: string) {
    return this.imprimeurService.findPublic(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch()
  update(@Req() req: any, @Body() dto: UpdateImprimeurProfilDto) {
    return this.imprimeurService.update(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('disponibilite')
  toggle(@Req() req: any, @Body() body: { disponible: boolean }) {
    return this.imprimeurService.toggleDisponible(req.user.id, body.disponible);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete()
  remove(@Req() req: any) {
    return this.imprimeurService.remove(req.user.id);
  }
}