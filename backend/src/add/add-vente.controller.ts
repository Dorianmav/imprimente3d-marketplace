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
import { AddVenteService } from './add-vente.service';
import { CreateAddVenteDto } from './dto/create-add-vente.dto';
import { UpdateAddVenteDto } from './dto/update-add-vente.dto';
import { RequireImprimeurGuard } from './guards/require-imprimeur.guard';

@Controller('add/vente')
export class AddVenteController {
  constructor(private readonly addVenteService: AddVenteService) {}

  @UseGuards(AuthGuard('jwt'), RequireImprimeurGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateAddVenteDto) {
    return this.addVenteService.create(req.user.id, dto);
  }

  @Get()
  findAll() {
    return this.addVenteService.findAllActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addVenteService.findOnePublic(id);
  }

  @UseGuards(AuthGuard('jwt'), RequireImprimeurGuard)
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddVenteDto,
  ) {
    return this.addVenteService.update(id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RequireImprimeurGuard)
  @Delete(':id')
  archive(@Req() req: any, @Param('id') id: string) {
    return this.addVenteService.archive(id, req.user.id);
  }
}