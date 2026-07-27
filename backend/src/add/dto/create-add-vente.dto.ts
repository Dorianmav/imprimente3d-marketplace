import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CategorieAnnonce, Materiau, ModeLivraison } from 'src/generated/prisma/client';

export class CreateAddVenteDto {
  @IsString()
  titre: string;

  @IsString()
  description: string;

  @IsEnum(CategorieAnnonce)
  categorie: CategorieAnnonce;

  @IsEnum(Materiau)
  materiau: Materiau;

  @IsString()
  couleur: string;

  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  prixProduit: number;

  @IsEnum(ModeLivraison)
  modeLivraison: ModeLivraison;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  fraisLivraison: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;
}