import fs from "fs";
import { tmpdir } from "os";
import path, { resolve } from "path";
import { Readable } from "stream";
import { Logger } from '@nestjs/common';

interface File {
  size: number;
  lastModified: Date;
}

export class FileService {
  private logger: Logger;
  private baseFilesPath: string;
  private static instance: FileService | null = null;

  private constructor() {
    this.baseFilesPath = path.join(tmpdir(), "files");
    fs.mkdirSync(this.baseFilesPath, { recursive: true });
    this.logger = new Logger(FileService.name);
  }

  public static getInstance() {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  private getSafeFilePath(relativePath: string) {
    const resolvedPath = resolve(this.baseFilesPath, relativePath);
    if (
      !resolvedPath.startsWith(this.baseFilesPath + path.sep) &&
      resolvedPath !== this.baseFilesPath
    ) {
      throw new Error("Invalid path");
    }
    return resolvedPath;
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.stat(filePath);

      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") return false;
      throw err;
    }
  }

  public async saveFile({
    filePath,
    stream,
  }: {
    filePath: string;
    stream: Readable;
  }): Promise<File & { path: string }> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });

    const safeFilePath = this.getSafeFilePath(filePath);
    const parentDir = path.dirname(safeFilePath);
    await fs.promises.mkdir(parentDir, { recursive: true });

    try {
      await fs.promises.writeFile(safeFilePath, stream);
      const stats = await fs.promises.stat(safeFilePath);
      const file: File = {
        size: stats.size,
        lastModified: stats.mtime,
      };
      this.logger.log(`File saved: ${safeFilePath}, Size: ${file.size}`);
      return { ...file, path: safeFilePath };
    } catch (error) {
      this.logger.error(`[FileService] Error saving file ${safeFilePath}:`, error);
      try {
        if (await this.exists(safeFilePath)) {
          await fs.promises.unlink(safeFilePath);
        }
      } catch (cleanupErr) {
        this.logger.error(`[FileService] Failed to cleanup file ${safeFilePath} after save error:`, cleanupErr);
      }
      throw error;
    }
  }

  public async downloadFile({
    filePath,
  }: {
    filePath: string;
  }): Promise<{ stream: Readable } & File> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    const safeFilePath = this.getSafeFilePath(filePath);

    try {
      const stats = await fs.promises.stat(safeFilePath);
      if (!stats.isFile()) {
        throw new Error(`Requested path is not a file: ${safeFilePath}`);
      }
      const file: File = {
        size: stats.size,
        lastModified: stats.mtime,
      };
      const stream = fs.createReadStream(safeFilePath);
      return {
        stream,
        ...file,
      };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${safeFilePath}`);
      }
      this.logger.error(`[FileService] Error accessing file ${safeFilePath} for download:`, error);
      throw new Error(`File not found or inaccessible: ${safeFilePath}`);
    }
  }

  public async getFile({ filePath }: { filePath: string }): Promise<File> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    const safeFilePath = this.getSafeFilePath(filePath);

    try {
      const stats = await fs.promises.stat(safeFilePath);
      if (!stats.isFile()) {
        throw new Error(`Requested path is not a file: ${safeFilePath}`);
      }
      const file: File = {
        size: stats.size,
        lastModified: stats.mtime,
      };
      return file;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${safeFilePath}`);
      }
      this.logger.error(`[FileService] Error accessing file ${safeFilePath} for getFile:`, error);
      throw new Error(`File not found or inaccessible: ${safeFilePath}`);
    }
  }

  public async listFiles(): Promise<Array<{ path: string } & File>> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });

    const allFiles: Array<{ path: string } & File> = [];

    const collectFilesRecursively = async (currentDir: string) => {
      try {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(currentDir, entry.name);
          if (entry.isFile()) {
            try {
              const stats = await fs.promises.stat(entryPath);
              allFiles.push({
                path: entryPath,
                size: stats.size,
                lastModified: stats.mtime,
              });
            } catch (statError) {
              this.logger.error(`[FileService] Error getting stats for file ${entryPath} during listFiles:`, statError);
            }
          } else if (entry.isDirectory()) {
            await collectFilesRecursively(entryPath);
          }
        }
      } catch (readDirError) {
        this.logger.error(`[FileService] Error reading directory ${currentDir} during listFiles:`, readDirError);
      }
    };

    try {
      await collectFilesRecursively(this.baseFilesPath);
      allFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      return allFiles;
    } catch (error) {
      this.logger.error(`[FileService] Error listing files recursively from ${this.baseFilesPath}:`, error);
      return [];
    }
  }

  public async deleteFile({ filePath }: { filePath: string }): Promise<void> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    const safeFilePath = this.getSafeFilePath(filePath);

    if (!(await this.exists(safeFilePath))) {
      this.logger.log(`[FileService] File ${safeFilePath} not found on disk during delete operation. Skipping.`);
      return;
    }

    try {
      const stats = await fs.promises.stat(safeFilePath);
      if (!stats.isFile()) {
        this.logger.warn(`[FileService] Path ${safeFilePath} is not a file. Skipping delete.`);
        return;
      }
      await fs.promises.unlink(safeFilePath);
      this.logger.log(`[FileService] File deleted: ${safeFilePath}`);
    } catch (unlinkError) {
      this.logger.error(`Error unlinking file ${safeFilePath}:`, unlinkError);
      throw unlinkError;
    }
  }

  public async cleanupFiles(): Promise<void> {
    this.logger.log(`[FileService cleanupFiles] Starting cleanup for directory: ${this.baseFilesPath}`);

    try {
      await fs.promises.rm(this.baseFilesPath, { recursive: true, force: true });
      this.logger.log(`[FileService cleanupFiles] Deleted entire directory: ${this.baseFilesPath}`);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        this.logger.error(`[FileService cleanupFiles] Error deleting directory ${this.baseFilesPath}:`, err);
      }
    }

    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    this.logger.log(`[FileService cleanupFiles] Files cleaned.`);
  }

  public getBaseFilesPath(): string {
    return this.baseFilesPath;
  }
}
