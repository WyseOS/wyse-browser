import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProxyDto {
  @IsString({ message: 'proxy_name name must be a string' })
  @Transform(({ value }) => value || 'proxy')
  readonly proxy_name: string;

  @IsString({ message: 'host name must be a string' })
  @Transform(({ value }) => value || '127.0.0.1')
  readonly host: string = '';

  @IsString({ message: 'proxyType name must be a string' })
  @Transform(({ value }) => value || 'ALL')
  readonly proxyType: string;

  @IsString({ message: 'proxyType name must be a string' })
  @Transform(({ value }) => value || '80')
  readonly port: string = '80';

  @IsOptional()
  @IsString({ message: 'username name must be a string' })
  @Transform(({ value }) => value || '')
  readonly username: string;

  @IsOptional()
  @IsString({ message: 'password name must be a string' })
  @Transform(({ value }) => value || '')
  readonly password: string;
}

export class CreateProfileDto {
  readonly profile_name: string;
  readonly browser: string;
  readonly proxyType: string;
  readonly fingerprint: string;
  readonly width: number;
  readonly height: number;
}
