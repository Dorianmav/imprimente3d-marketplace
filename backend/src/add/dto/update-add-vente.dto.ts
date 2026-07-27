import { PartialType } from '@nestjs/mapped-types';
import { CreateAddVenteDto } from './create-add-vente.dto';

export class UpdateAddVenteDto extends PartialType(CreateAddVenteDto) {}