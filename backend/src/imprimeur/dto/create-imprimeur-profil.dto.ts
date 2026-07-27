import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Materiau } from 'src/generated/prisma/client';

export class ImprimanteDto {
  @IsString()
  marque: string;

  @IsString()
  modele: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dimensionMaxX: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dimensionMaxY: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dimensionMaxZ: number;
}

export class CreateImprimeurProfilDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImprimanteDto)
  imprimantes: ImprimanteDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Materiau, { each: true })
  materiaux: Materiau[];

  @IsOptional()
  @IsString()
  zoneExpedition?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  delaiMoyenJours: number;

  @IsOptional()
  @IsString()
  tarifsIndicatifs?: string;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
