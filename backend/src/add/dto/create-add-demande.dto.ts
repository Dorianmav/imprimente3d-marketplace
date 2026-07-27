import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Materiau } from 'src/generated/prisma/client';

export class CreateAddDemandeDto {
  @IsString()
  titre: string;

  @ValidateIf((o) => !o.fichier3d)
  @IsString()
  description?: string;

  @ValidateIf((o) => !o.description)
  @IsString()
  fichier3d?: string;

  @IsOptional()
  photosReference?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsEnum(Materiau)
  materiauSouhaite?: Materiau;

  @IsOptional()
  @IsString()
  couleurSouhaitee?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantite?: number;
}