import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SocialMedia {
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @IsUrl()
  @IsOptional()
  twitter?: string;

  @IsUrl()
  @IsOptional()
  website?: string;
}

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  biography: string;

  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nationality: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  genres: string[];

  @ValidateNested()
  @IsOptional()
  @Type(() => SocialMedia)
  socialMedia?: SocialMedia;
}
