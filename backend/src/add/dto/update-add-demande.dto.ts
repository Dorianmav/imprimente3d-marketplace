import { PartialType } from '@nestjs/mapped-types';
import { CreateAddDemandeDto } from './create-add-demande.dto';

export class UpdateAddDemandeDto extends PartialType(CreateAddDemandeDto) {}