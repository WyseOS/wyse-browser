import { Injectable, Logger } from '@nestjs/common';
import { FileService } from '../file';
import { FILE_CONSTANTS } from '../constants';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

interface FileDetails {
    path: string;
    size: number;
    lastModified: string;
}

interface MultipleFiles {
    data: FileDetails[];
}

@Injectable()
export class FileApiService {
    private logger: Logger;
    private coreFileService: FileService;
    private baseFilesPath: string;

    constructor() {
        this.logger = new Logger(FileApiService.name);
        this.coreFileService = FileService.getInstance();
        this.baseFilesPath = this.coreFileService.getBaseFilesPath();
    }

    // Session isolation core methods
    private getSessionBasePath(sessionId: string): string {
        this.validateSessionId(sessionId);
        return path.join(this.baseFilesPath, sessionId);
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

    private getSessionFilePath(sessionId: string, relativePath: string): string {
        const sessionBasePath = this.getSessionBasePath(sessionId);

        if (!fs.existsSync(sessionBasePath)) {
            fs.mkdirSync(sessionBasePath, { recursive: true });
            this.logger.log(`Created session directory: ${sessionId}`);
        }

        const resolvedPath = path.resolve(sessionBasePath, relativePath);
        if (!resolvedPath.startsWith(sessionBasePath + path.sep) && resolvedPath !== sessionBasePath) {
            throw new Error(`Invalid file path: ${relativePath} - outside session directory`);
        }

        return resolvedPath;
    }

    async getSessionStorageSize(sessionId: string): Promise<number> {
        const sessionBasePath = this.getSessionBasePath(sessionId);

        if (!fs.existsSync(sessionBasePath)) {
            return 0;
        }

        return this.calculateDirectorySize(sessionBasePath);
    }

    private async calculateDirectorySize(dirPath: string): Promise<number> {
        let totalSize = 0;

        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);

                if (entry.isFile()) {
                    const stats = await fs.promises.stat(entryPath);
                    totalSize += stats.size;
                } else if (entry.isDirectory()) {
                    totalSize += await this.calculateDirectorySize(entryPath);
                }
            }
        } catch (error) {
            this.logger.error(`Error calculating directory size: ${error.message}`);
        }

        return totalSize;
    }

    // Core file operations with session isolation
    async handleFileUpload(sessionId: string, filePath: string, stream: Readable): Promise<FileDetails> {
        const sessionFilePath = this.getSessionFilePath(sessionId, filePath);

        const result = await this.coreFileService.saveFile({
            filePath: sessionFilePath,
            stream,
        });

        return {
            path: filePath, // Return relative path to session
            size: result.size,
            lastModified: result.lastModified.toISOString(),
        };
    }

    async handleFileDownload(sessionId: string, filePath: string): Promise<{
        stream: Readable;
        headers: Record<string, string>;
    }> {
        const sessionFilePath = this.getSessionFilePath(sessionId, filePath);

        const { stream, size, lastModified } = await this.coreFileService.downloadFile({
            filePath: sessionFilePath,
        });

        const headers = {
            'Content-Type': this.getMimeType(filePath),
            'Content-Length': size.toString(),
            'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            'Last-Modified': lastModified.toUTCString(),
        };

        return { stream, headers };
    }

    async handleFileHead(sessionId: string, filePath: string): Promise<Record<string, string>> {
        const sessionFilePath = this.getSessionFilePath(sessionId, filePath);

        const { size, lastModified } = await this.coreFileService.getFile({
            filePath: sessionFilePath,
        });

        return {
            'Content-Type': this.getMimeType(filePath),
            'Content-Length': size.toString(),
            'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            'Last-Modified': lastModified.toUTCString(),
        };
    }

    async handleFileList(sessionId: string): Promise<MultipleFiles> {
        const sessionBasePath = this.getSessionBasePath(sessionId);

        if (!fs.existsSync(sessionBasePath)) {
            return { data: [] };
        }

        const files = await this.listSessionFiles(sessionBasePath);

        return {
            data: files.map(file => ({
                path: file.relativePath,
                size: file.size,
                lastModified: file.lastModified.toISOString(),
            })),
        };
    }

    async handleFileDelete(sessionId: string, filePath: string): Promise<void> {
        const sessionFilePath = this.getSessionFilePath(sessionId, filePath);

        await this.coreFileService.deleteFile({
            filePath: sessionFilePath,
        });
    }

    async handleFileDeleteAll(sessionId: string): Promise<void> {
        const sessionBasePath = this.getSessionBasePath(sessionId);

        if (fs.existsSync(sessionBasePath)) {
            await fs.promises.rm(sessionBasePath, { recursive: true, force: true });
            this.logger.log(`Deleted all files for session: ${sessionId}`);
        }
    }

    async handleDownloadArchive(sessionId: string): Promise<{
        stream: Readable;
        headers: Record<string, string>;
    }> {
        // Use core service's archive functionality
        const archivePath = await this.coreFileService.getPrebuiltArchivePath();

        const stats = await fs.promises.stat(archivePath);
        const stream = fs.createReadStream(archivePath);

        const headers = {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="session-${sessionId}-files.zip"`,
            'Content-Length': stats.size.toString(),
            'Last-Modified': stats.mtime.toUTCString(),
        };

        return { stream, headers };
    }

    // Helper methods
    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.zip': 'application/zip',
            '.csv': 'text/csv',
            '.html': 'text/html',
            '.xml': 'application/xml',
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    private async listSessionFiles(sessionPath: string): Promise<Array<{
        relativePath: string;
        size: number;
        lastModified: Date;
    }>> {
        const files: Array<{ relativePath: string; size: number; lastModified: Date }> = [];

        const collectFiles = async (currentDir: string, relativePath = ''): Promise<void> => {
            const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(currentDir, entry.name);
                const entryRelativePath = path.join(relativePath, entry.name);

                if (entry.isFile()) {
                    const stats = await fs.promises.stat(entryPath);
                    files.push({
                        relativePath: entryRelativePath,
                        size: stats.size,
                        lastModified: stats.mtime,
                    });
                } else if (entry.isDirectory()) {
                    await collectFiles(entryPath, entryRelativePath);
                }
            }
        };

        await collectFiles(sessionPath);
        return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }
}