import { Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { OSSFiles } from '../utils/oss';
import { FILE_CONSTANTS } from '../constants';
import { SendAlarm } from '../utils/alarm';

export interface DownloadResult {
    uniqueFilename: string;
    fileSize: number;
    duration: number;
}

export interface DownloadOptions {
    sessionId: string;
    suggestedFilename: string;
    readStream: Readable;
    startTime: number;
}

export class DownloadService {
    private readonly logger = new Logger(DownloadService.name);

    async uploadDownloadedFile(options: DownloadOptions): Promise<DownloadResult> {
        const { sessionId, suggestedFilename, readStream, startTime } = options;

        const fileExtension = path.extname(suggestedFilename).toLowerCase();

        this.validateFileExtension(fileExtension, sessionId, suggestedFilename);

        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const objectPath = OSSFiles.getObjectPath(sessionId, uniqueFilename);

        await OSSFiles.putStream(
            objectPath,
            readStream,
            this.getContentType(fileExtension)
        );

        const fileSize = await this.getFileSize(objectPath);

        await this.validateFileSize(fileSize, objectPath, uniqueFilename, sessionId);
        await this.validateSessionStorage(sessionId, objectPath);

        const duration = Date.now() - startTime;

        return {
            uniqueFilename,
            fileSize,
            duration,
        };
    }

    private validateFileExtension(extension: string, sessionId: string, filename: string): void {
        if (!(FILE_CONSTANTS.ALLOWED_DOWNLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
            this.logger.warn(`File type not allowed: ${extension}`);
            SendAlarm.sendTextMessage(
                'File Type Not Allowed',
                `Session: ${sessionId}\nFilename: ${filename}\nExtension: ${extension}`
            ).catch(err => this.logger.error(`Failed to send alarm: ${err.message}`));

            throw new Error(`File type "${extension}" is not allowed`);
        }
    }

    private async getFileSize(objectPath: string): Promise<number> {
        const fileMetadata = await OSSFiles.head(objectPath);
        return parseInt(fileMetadata.res.headers['content-length'] || '0', 10);
    }

    private async validateFileSize(
        fileSize: number,
        objectPath: string,
        filename: string,
        sessionId: string
    ): Promise<void> {
        if (fileSize > FILE_CONSTANTS.MAX_DOWNLOAD_FILE_SIZE) {
            await OSSFiles.deleteFile(objectPath);

            const maxSizeMB = (FILE_CONSTANTS.MAX_DOWNLOAD_FILE_SIZE / (1024 * 1024)).toFixed(0);
            const actualSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

            this.logger.warn(`File size exceeded: ${actualSizeMB}MB > ${maxSizeMB}MB`);
            await SendAlarm.sendTextMessage(
                'File Size Exceeded',
                `Session: ${sessionId}\nFilename: ${filename}\nSize: ${actualSizeMB}MB\nLimit: ${maxSizeMB}MB`
            ).catch(err => this.logger.error(`Failed to send alarm: ${err.message}`));

            throw new Error(`File size ${actualSizeMB}MB exceeds maximum ${maxSizeMB}MB`);
        }
    }

    private async validateSessionStorage(sessionId: string, objectPath: string): Promise<void> {
        const currentSessionSize = await OSSFiles.getSessionStorageSize(sessionId);

        if (currentSessionSize > FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION) {
            await OSSFiles.deleteFile(objectPath);

            const maxSessionSizeMB = (FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION / (1024 * 1024)).toFixed(0);
            const currentSizeMB = (currentSessionSize / (1024 * 1024)).toFixed(2);

            this.logger.warn(`Session storage exceeded: ${currentSizeMB}MB > ${maxSessionSizeMB}MB`);
            await SendAlarm.sendTextMessage(
                'Session Storage Exceeded',
                `Session: ${sessionId}\nCurrent: ${currentSizeMB}MB\nLimit: ${maxSessionSizeMB}MB`
            ).catch(err => this.logger.error(`Failed to send alarm: ${err.message}`));

            throw new Error(`Session storage limit exceeded: ${currentSizeMB}MB > ${maxSessionSizeMB}MB`);
        }
    }

    private getContentType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        };

        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }
}

