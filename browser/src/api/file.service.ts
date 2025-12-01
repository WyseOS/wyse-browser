import { Injectable, Logger } from '@nestjs/common';
import { OSSFiles } from '../utils/oss';
import { SendAlarm } from '../utils/alarm';
import { FILE_CONSTANTS } from '../constants';
import { Readable } from 'stream';

interface FileDetails {
    path: string;
    size: number;
    lastModified: string;
    url: string;
}

interface MultipleFiles {
    data: FileDetails[];
}

@Injectable()
export class FileApiService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger(FileApiService.name);
    }

    private validateSessionId(sessionId: string): void {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('Invalid session ID: must be non-empty string');
        }

        if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
            throw new Error('Invalid session ID: contains illegal characters');
        }

        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
            throw new Error('Invalid session ID: alphanumeric with hyphens/underscores only, max 64 chars');
        }
    }

    async getSessionStorageSize(sessionId: string): Promise<number> {
        this.validateSessionId(sessionId);
        return await OSSFiles.getSessionStorageSize(sessionId);
    }

    async handleFileUpload(sessionId: string, filePath: string, stream: Readable): Promise<FileDetails> {
        this.validateSessionId(sessionId);

        try {
            const currentSize = await this.getSessionStorageSize(sessionId);
            if (currentSize >= FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION) {
                throw new Error('Session storage limit exceeded');
            }

            const objectPath = OSSFiles.getObjectPath(sessionId, filePath);
            const result = await OSSFiles.putStream(objectPath, stream);

            const fileMetadata = await OSSFiles.head(objectPath);
            const fileSize = parseInt(fileMetadata.res.headers['content-length'] || '0', 10);

            const relativePath = OSSFiles.getRelativePath(objectPath);

            return {
                path: relativePath,
                size: fileSize,
                lastModified: fileMetadata.res.headers['last-modified'] || new Date().toISOString(),
                url: result.url,
            };

        } catch (error) {
            this.logger.error(`File upload failed: ${sessionId}/${filePath}, error: ${error.message}`);

            await SendAlarm.sendTextMessage(
                'File Upload Failed',
                `Session: ${sessionId}\nFilename: ${filePath}\nError: ${error.message}`
            ).catch(err => this.logger.error(`Failed to send alarm: ${err.message}`));

            throw error;
        }
    }

    async handleFileDownload(sessionId: string, relativePath: string): Promise<{
        stream: Readable;
        headers: Record<string, string>;
    }> {
        this.validateSessionId(sessionId);

        try {
            const objectPath = OSSFiles.buildObjectPath(relativePath);
            const stream = await OSSFiles.getStream(objectPath);
            const metadata = await OSSFiles.head(objectPath);

            const filename = relativePath.split('/').pop() || relativePath;

            const headers = {
                'Content-Type': metadata.res.headers['content-type'] || 'application/octet-stream',
                'Content-Length': metadata.res.headers['content-length'] || '0',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Last-Modified': metadata.res.headers['last-modified'] || new Date().toUTCString(),
            };

            return { stream, headers };

        } catch (error) {
            this.logger.error(`File download failed: ${sessionId}/${relativePath}, error: ${error.message}`);
            throw error;
        }
    }

    async handleFileHead(sessionId: string, relativePath: string): Promise<Record<string, string>> {
        this.validateSessionId(sessionId);

        try {
            const objectPath = OSSFiles.buildObjectPath(relativePath);
            const metadata = await OSSFiles.head(objectPath);

            const filename = relativePath.split('/').pop() || relativePath;

            return {
                'Content-Type': metadata.res.headers['content-type'] || 'application/octet-stream',
                'Content-Length': metadata.res.headers['content-length'] || '0',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Last-Modified': metadata.res.headers['last-modified'] || new Date().toUTCString(),
            };

        } catch (error) {
            this.logger.error(`File head failed: ${sessionId}/${relativePath}, error: ${error.message}`);
            throw error;
        }
    }

    async handleFileList(sessionId: string): Promise<MultipleFiles> {
        this.validateSessionId(sessionId);

        try {
            const files = await OSSFiles.listSessionFiles(sessionId);

            return {
                data: files.map(file => ({
                    path: OSSFiles.getRelativePath(file.name),
                    size: file.size,
                    lastModified: file.lastModified || new Date().toISOString(),
                    url: OSSFiles.getPublicUrl(file.name),
                })),
            };

        } catch (error) {
            this.logger.error(`File list failed: ${sessionId}, error: ${error.message}`);
            throw error;
        }
    }

    async handleFileDelete(sessionId: string, relativePath: string): Promise<void> {
        this.validateSessionId(sessionId);

        try {
            const objectPath = OSSFiles.buildObjectPath(relativePath);
            await OSSFiles.deleteFile(objectPath);

            this.logger.log(`File deleted: ${objectPath}`);

        } catch (error) {
            this.logger.error(`File delete failed: ${sessionId}/${relativePath}, error: ${error.message}`);
            throw error;
        }
    }

    async handleFileDeleteAll(sessionId: string): Promise<number> {
        this.validateSessionId(sessionId);

        try {
            const deletedCount = await OSSFiles.deleteSessionFiles(sessionId);

            this.logger.log(`Deleted ${deletedCount} files for session: ${sessionId}`);
            return deletedCount;

        } catch (error) {
            this.logger.error(`Delete all files failed: ${sessionId}, error: ${error.message}`);
            throw error;
        }
    }
}
