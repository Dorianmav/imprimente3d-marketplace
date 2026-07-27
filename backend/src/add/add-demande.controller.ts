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
import { AddDemandeService } from './add-demande.service';
import { CreateAddDemandeDto } from './dto/create-add-demande.dto';
import { UpdateAddDemandeDto } from './dto/update-add-demande.dto';

@Controller('add/demande')
export class AddDemandeController {
  constructor(private readonly addDemandeService: AddDemandeService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: any, @Body() dto: CreateAddDemandeDto) {
    return this.addDemandeService.create(req.user.id, dto);
  }

  @Get()
  findAll() {
    return this.addDemandeService.findAllOuvertes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addDemandeService.findOnePublic(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddDemandeDto,
  ) {
    return this.addDemandeService.update(id, req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.addDemandeService.cancel(id, req.user.id);
  }
}