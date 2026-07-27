import { PartialType } from '@nestjs/mapped-types';
import { CreateImprimeurProfilDto } from './create-imprimeur-profil.dto';

export class UpdateImprimeurProfilDto extends PartialType(CreateImprimeurProfilDto) {}