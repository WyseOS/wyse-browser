import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsValidSessionId, IsValidExtensionNames } from '../validators';

export interface CookieItem {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface StorageItem {
    name: string;
    value: string;
}

export interface Origin {
    origin: string;
    localStorage: StorageItem[];
}

export class SessionContext {
    @IsOptional()
    @IsString({ message: 'User agent must be a string' })
    @Transform(({ value }) => value || '')
    readonly userAgent: string = '';

    @IsOptional()
    @IsString({ message: 'Region must be a string' })
    @Transform(({ value }) => value || 'US/Pacific')
    readonly region: string = 'US/Pacific';

    @IsOptional()
    @IsBoolean({ message: 'Solve captcha must be a boolean' })
    @Transform(({ value }) => value ?? false)
    readonly solveCaptcha: boolean = false;

    @IsOptional()
    @IsNumber({}, { message: 'Width must be a number' })
    @Min(800, { message: 'Width must be at least 800' })
    @Max(3840, { message: 'Width must not exceed 3840' })
    @Transform(({ value }) => value || 1440)
    readonly width: number = 1440;

    @IsOptional()
    @IsNumber({}, { message: 'Height must be a number' })
    @Min(600, { message: 'Height must be at least 600' })
    @Max(2160, { message: 'Height must not exceed 2160' })
    @Transform(({ value }) => value || 900)
    readonly height: number = 900;

    @IsOptional()
    @IsNumber({}, { message: 'Timeout must be a number' })
    @Min(1000, { message: 'Timeout must be at least 1000ms' })
    @Max(300000, { message: 'Timeout must not exceed 300000ms' })
    @Transform(({ value }) => value || 30000)
    readonly timeout: number = 30000;

    @IsOptional()
    @IsString({ message: 'Timezone must be a string' })
    @Transform(({ value }) => value || 'America/New_York')
    readonly timezone: string = 'America/New_York';

    @IsOptional()
    @IsArray({ message: 'Cookies must be an array' })
    @Transform(({ value }) => {
        if (!Array.isArray(value)) return [];
        return value.filter(cookie =>
            cookie &&
            typeof cookie === 'object' &&
            cookie.name &&
            cookie.value
        ).map(cookie => ({
            name: String(cookie.name),
            value: String(cookie.value),
            domain: cookie.domain ? String(cookie.domain) : undefined,
            path: cookie.path ? String(cookie.path) : undefined,
            expires: typeof cookie.expires === 'number' ? cookie.expires : undefined,
            httpOnly: typeof cookie.httpOnly === 'boolean' ? cookie.httpOnly : undefined,
            secure: typeof cookie.secure === 'boolean' ? cookie.secure : undefined,
            sameSite: cookie.sameSite
        }));
    })
    readonly cookies: CookieItem[] = [];

    @IsOptional()
    @IsArray({ message: 'Origins must be an array' })
    @Transform(({ value }) => {
        if (!Array.isArray(value)) return [];
        return value.filter(origin =>
            origin &&
            typeof origin === 'object' &&
            origin.origin &&
            Array.isArray(origin.localStorage)
        ).map(origin => ({
            origin: String(origin.origin),
            localStorage: origin.localStorage
                .filter(item => item && typeof item === 'object' && item.name && item.value)
                .map(item => ({
                    name: String(item.name),
                    value: String(item.value)
                }))
        }));
    })
    readonly origins: Origin[] = [];

    @IsOptional()
    @IsBoolean({ message: 'Save video must be a boolean' })
    @Transform(({ value }) => value ?? false)
    readonly isSaveVideo: boolean = false;

    @IsOptional()
    @IsArray({ message: 'Extension names must be an array' })
    @IsValidExtensionNames()
    @Transform(({ value }) => value || [])
    readonly extensionNames: string[] = [];
}

export class CreateSessionDto {
    @IsOptional()
    @IsObject({ message: 'Session context must be an object' })
    @Transform(({ value }) => {
        if (!value) return undefined;
        if (typeof value === 'object' && !value.session_context) {
            // 如果直接传入了 cookies 和 origins，将其包装到 session_context 中
            if (value.cookies || value.origins) {
                return {
                    cookies: value.cookies || [],
                    origins: value.origins || [],
                    isSaveVideo: false,
                    extensionNames: []
                };
            }
        }
        // 处理标准格式的请求
        return {
            ...value,
            cookies: value.cookies || [],
            origins: value.origins || [],
            isSaveVideo: value.is_save_video ?? false,
            extensionNames: value.extension_names || []
        };
    })
    readonly session_context?: SessionContext;

    @IsOptional()
    @IsString({ message: 'Session ID must be a string' })
    @IsValidSessionId()
    readonly session_id?: string;
}

/**
 * DTO for adding initialization scripts
 */
export class AddInitScriptDto {
    @IsString({ message: 'Script must be a string' })
    @IsNotEmpty({ message: 'Script cannot be empty' })
    readonly script: string;
}

/**
 * DTO for releasing a session
 */
export class ReleaseSessionDto {
    @IsString({ message: 'Session ID must be a string' })
    @IsNotEmpty({ message: 'Session ID cannot be empty' })
    @IsValidSessionId()
    readonly session_id: string;
}