import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, Matches, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Incoterm, ProductStatus, TradeDirection } from '@prisma/client';

// Server-side validation is not a mirror of the client's. The client's job is to
// give the operator fast feedback; this is the boundary that assumes the client
// was bypassed entirely - a raw curl with junk must be rejected here.

export class VarietyDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(80) grade?: string | null;
  @IsOptional() @IsInt() @Min(0) calibreMin?: number | null;
  @IsOptional() @IsInt() @Min(0) calibreMax?: number | null;
}

export class PackOptionDto {
  @IsOptional() @IsString() id?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) cartonWeightKg!: number;
  @IsOptional() @IsInt() @Min(0) cartonsPerPallet?: number | null;
  @IsOptional() @IsInt() @Min(0) palletsPerReefer?: number | null;
  @IsOptional() @IsInt() @Min(0) cartonsPerReefer?: number | null;
  @IsOptional() @IsString() @MaxLength(300) notes?: string | null;
}

export class CertificationDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsBoolean() verifiable?: boolean;
  @IsOptional() @IsString() @MaxLength(160) reference?: string | null;
}

export class UpsertProductDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase, digits and single hyphens' })
  @MaxLength(120)
  slug!: string;

  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsString() @MinLength(1) @MaxLength(120) type!: string;
  @IsString() @MinLength(1) @MaxLength(4000) description!: string;
  @IsString() @MinLength(1) @MaxLength(160) season!: string;
  @IsString() @MinLength(1) @MaxLength(200) origin!: string;
  @IsString() @MinLength(1) @MaxLength(200) packaging!: string;

  // `image` is gone: imagery moved to MediaAsset in Phase 1b and is managed
  // through /api/media, not through the product payload. A stray `image` key now
  // fails forbidNonWhitelisted, which is the intended loud failure.

  @IsOptional() @IsEnum(TradeDirection) trade?: TradeDirection;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsBoolean() placeholder?: boolean;

  // ── Aspirational spec: every field optional, none blocks creation ──────────
  @IsOptional() @Matches(/^\d{6,10}$/, { message: 'hsCode must be 6-10 digits' }) hsCode?: string | null;
  @IsOptional() @IsArray() @IsEnum(Incoterm, { each: true }) incoterms?: Incoterm[];
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) moqValue?: number | null;
  @IsOptional() @IsString() @MaxLength(40) moqUnit?: string | null;
  @IsOptional() @IsInt() @Min(0) shelfLifeDays?: number | null;
  @IsOptional() @IsString() @MaxLength(40) storageTempC?: string | null;
  @IsOptional() @IsString() @MaxLength(40) storageHumidity?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20) portsOfLoading?: string[];
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(400) seoDescription?: string | null;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VarietyDto) varieties?: VarietyDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PackOptionDto) packOptions?: PackOptionDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CertificationDto) certifications?: CertificationDto[];
}
