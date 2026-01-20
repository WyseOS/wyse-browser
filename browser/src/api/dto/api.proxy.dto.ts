import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNumber,
  IsNumberString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class DeleteProxyDto {
  @IsString({ message: 'proxy_id name must be a string' })
  @Transform(({ value }) => value || '')
  readonly proxy_id: string;
}
export class DeleteProfileDto {
  @IsString({ message: 'profile_id name must be a string' })
  @Transform(({ value }) => value || '')
  readonly profile_id: string;
}
export class UpdateProxyDto {
  @IsString({ message: 'proxy_id name must be a string' })
  @Transform(({ value }) => value || '')
  readonly proxy_id: string;

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
  @IsString({ message: 'profile_name must be a string' })
  @Transform(({ value }) => value || '')
  readonly profile_name: string;

  @IsString({ message: 'browser name must be a string' })
  @Transform(({ value }) => value || '')
  readonly browser: string;

  @IsString({ message: 'proxy name must be a string' })
  @Transform(({ value }) => value || '')
  readonly proxy: string;

  @IsString({ message: 'fingerprint name must be a string' })
  @Transform(({ value }) => value || '')
  readonly fingerprint: string;

  @IsString({ message: 'width name must be a string' })
  @Transform(({ value }) => value || '1440')
  readonly width: string;

  @IsString({ message: 'height name must be a string' })
  @Transform(({ value }) => value || '800')
  readonly height: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  readonly solve_captcha: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  readonly is_save_video: boolean;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ?? 20000)
  readonly timeout: number;
}
export class UpdateProfileDto {
  @IsString({ message: 'profile_id name must be a string' })
  @Transform(({ value }) => value || '')
  readonly profile_id: string;

  @IsString({ message: 'profile_name must be a string' })
  @Transform(({ value }) => value || '')
  readonly profile_name: string;

  @IsString({ message: 'browser name must be a string' })
  @Transform(({ value }) => value || '')
  readonly browser: string;

  @IsString({ message: 'proxy name must be a string' })
  @Transform(({ value }) => value || '')
  readonly proxy: string;

  @IsString({ message: 'fingerprint name must be a string' })
  @Transform(({ value }) => value || '')
  readonly fingerprint: string;

  @IsString({ message: 'width name must be a string' })
  @Transform(({ value }) => value || '1440')
  readonly width: string;

  @IsString({ message: 'height name must be a string' })
  @Transform(({ value }) => value || '800')
  readonly height: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  readonly solve_captcha: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  readonly is_save_video: boolean;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ?? 20000)
  readonly timeout: number;
}
