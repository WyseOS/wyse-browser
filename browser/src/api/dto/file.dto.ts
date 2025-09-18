import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class FileUploadDto {
    @IsOptional()
    @IsString()
    path?: string;
}

export class FileDetailsDto {
    @IsString()
    path: string;

    @IsNotEmpty()
    size: number;

    @IsString()
    lastModified: string;
}

export class MultipleFilesDto {
    data: FileDetailsDto[];
}
