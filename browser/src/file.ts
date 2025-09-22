import archiver from "archiver";
import chokidar, { FSWatcher } from "chokidar";
import fs from "fs";
import type { DebouncedFunc } from "lodash-es";
import { debounce } from "lodash-es";
import { tmpdir } from "os";
import path, { resolve } from "path";
import { Readable } from "stream";
//import { env } from "../env.js";
import { Logger } from '@nestjs/common';

interface File {
  size: number;
  lastModified: Date;
}

export class FileService {
  private logger: Logger;
  private baseFilesPath: string;
  private fileWatcher: FSWatcher | null = null;
  private static instance: FileService | null = null;
  private prebuiltArchiveDir: string;
  private prebuiltArchivePath: string;
  private isArchiving: boolean = false;
  private archiveDebounceTime = 500;
  private debouncedCreateArchive: DebouncedFunc<() => Promise<string | null>>;

  private constructor() {
    //this.baseFilesPath = env.NODE_ENV !== "production" ? path.join(tmpdir(), "files") : "/files";
    this.baseFilesPath = path.join(tmpdir(), "files");
    this.prebuiltArchiveDir = "/tmp/.browser";
    this.prebuiltArchivePath = path.join(this.prebuiltArchiveDir, "files.zip");

    fs.mkdirSync(this.baseFilesPath, { recursive: true });

    const boundCreateArchive = this._createArchive.bind(this);
    this.debouncedCreateArchive = debounce(boundCreateArchive, this.archiveDebounceTime);

    this.logger = new Logger(FileService.name);
    this.initFileWatcher();
  }

  public static getInstance() {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  private async handleFileAdd(filePath: string) {
    this.logger.log(`[FileService] File added detected: ${filePath}`);
    this.debouncedCreateArchive();
  }

  private handleFileDelete(filePath: string) {
    this.logger.log(`[FileService] File deleted detected: ${filePath}`);
    this.debouncedCreateArchive();
  }

  private handleDirChange(filePath: string) {
    this.logger.log(`[FileService] Directory change detected: ${filePath}`);
    this.debouncedCreateArchive();
  }

  private initFileWatcher() {
    this.fileWatcher = chokidar.watch(this.baseFilesPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      depth: undefined,
    });

    this.logger.log(`[FileService] File watcher initialized for ${this.baseFilesPath}`);

    this.fileWatcher
      .on("add", (filePath) => this.handleFileAdd(filePath))
      .on("unlink", (filePath) => this.handleFileDelete(filePath))
      .on("addDir", (filePath) => this.handleDirChange(filePath))
      .on("unlinkDir", (filePath) => this.handleDirChange(filePath))
      .on("error", (error) => this.logger.error(`Watcher error: ${error}`))
      .on("ready", () => {
        this.logger.log("[FileService] Initial scan complete. Ready for changes.");
        this.debouncedCreateArchive();
      });
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
      this.debouncedCreateArchive();
      return { ...file, path: safeFilePath };
    } catch (error) {
      this.logger.error(`[FileService] Error saving file ${safeFilePath}:`, error);

      try {
        if (await this.exists(safeFilePath)) {
          await fs.promises.unlink(safeFilePath);
        }
      } catch (cleanupErr) {
        this.logger.error(
          `[FileService] Failed to cleanup file ${safeFilePath} after save error:`,
          cleanupErr,
        );
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
              this.logger.error(
                `[FileService] Error getting stats for file ${entryPath} during listFiles:`,
                statError,
              );
            }
          } else if (entry.isDirectory()) {
            await collectFilesRecursively(entryPath);
          }
        }
      } catch (readDirError) {
        this.logger.error(
          `[FileService] Error reading directory ${currentDir} during listFiles:`,
          readDirError,
        );
      }
    };

    try {
      await collectFilesRecursively(this.baseFilesPath);
      allFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      return allFiles;
    } catch (error) {
      this.logger.error(
        `[FileService] Error listing files recursively from ${this.baseFilesPath}:`,
        error,
      );
      return [];
    }
  }

  public async deleteFile({ filePath }: { filePath: string }): Promise<void> {
    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    const safeFilePath = this.getSafeFilePath(filePath);

    if (!(await this.exists(safeFilePath))) {
      this.logger.log(
        `[FileService] File ${safeFilePath} not found on disk during delete operation. Skipping.`,
      );
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
      this.debouncedCreateArchive();
    } catch (unlinkError) {
      this.logger.error(`Error unlinking file ${safeFilePath}:`, unlinkError);
      throw unlinkError;
    }

    return;
  }

  public async cleanupFiles(): Promise<void> {
    this.logger.log(`[FileService cleanupFiles] Starting cleanup for directory: ${this.baseFilesPath}`);

    this.debouncedCreateArchive.cancel();

    try {
      const archivePath = path.join(this.prebuiltArchiveDir, "files.zip");
      if (fs.existsSync(archivePath)) {
        await fs.promises.unlink(archivePath);
        this.logger.log(`[FileService cleanupFiles] Deleted archive file: ${archivePath}`);
      }

      const archiveDir = await fs.promises.readdir(this.prebuiltArchiveDir).catch(() => []);
      for (const file of archiveDir) {
        if (file.startsWith("files-") && file.endsWith(".zip.tmp")) {
          const tempFilePath = path.join(this.prebuiltArchiveDir, file);
          await fs.promises.unlink(tempFilePath).catch((err) => {
            this.logger.error(
              `[FileService cleanupFiles] Error deleting temp archive ${tempFilePath}:`,
              err,
            );
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`[FileService cleanupFiles] Error cleaning up archive files:`, err);
    }

    try {
      await fs.promises.rm(this.baseFilesPath, { recursive: true, force: true });
      this.logger.log(`[FileService cleanupFiles] Deleted entire directory: ${this.baseFilesPath}`);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        this.logger.error(
          `[FileService cleanupFiles] Error deleting directory ${this.baseFilesPath}:`,
          err,
        );
      }
    }

    await fs.promises.mkdir(this.baseFilesPath, { recursive: true });
    this.logger.log(`[FileService cleanupFiles] Files cleaned. Creating empty archive.`);
    this.debouncedCreateArchive();
  }

  public getBaseFilesPath(): string {
    return this.baseFilesPath;
  }

  public async getPrebuiltArchivePath(): Promise<string> {
    return this.prebuiltArchivePath;
  }

  private _createArchive(): Promise<string | null> {
    return new Promise(async (resolvePromise, rejectPromise) => {
      if (this.isArchiving) {
        this.logger.warn(
          `[_createArchive] Warning: Archiving process initiated while another is already in progress. This might lead to conflicts if not handled by caller.`,
        );
      }

      this.isArchiving = true;
      this.logger.log(`[_createArchive] Starting archive creation`);

      const tempArchivePath = path.join(this.prebuiltArchiveDir, `files-${Date.now()}.zip.tmp`);
      const finalArchivePath = path.join(this.prebuiltArchiveDir, "files.zip");

      try {
        await fs.promises.mkdir(this.prebuiltArchiveDir, { recursive: true });
      } catch (mkdirError) {
        this.logger.error(
          `[_createArchive] Error creating archive directory ${this.prebuiltArchiveDir}:`,
          mkdirError,
        );
        this.isArchiving = false;
        return rejectPromise(mkdirError);
      }

      const output = fs.createWriteStream(tempArchivePath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      let errorOccurredStream = false;

      const operationCleanup = async (
        success: boolean,
        archivePath: string | null = null,
        error?: any,
      ) => {
        this.isArchiving = false;

        if (!success && tempArchivePath && (await this.exists(tempArchivePath))) {
          try {
            await fs.promises.unlink(tempArchivePath);
            this.logger.log("[_createArchive] Cleaned up temporary archive file due to error.");
          } catch (unlinkErr) {
            this.logger.error(
              "[_createArchive] Failed to clean up temp archive file after error:",
              unlinkErr,
            );
          }
        }
        if (success && archivePath) {
          resolvePromise(archivePath);
        } else {
          rejectPromise(error || new Error("Archiving failed due to an unknown reason."));
        }
      };

      output.on("close", async () => {
        if (errorOccurredStream) {
          this.logger.log(
            "[_createArchive] Output stream closed after an error was emitted and handled.",
          );
          return;
        }
        try {
          if (await this.exists(finalArchivePath)) {
            await fs.promises.unlink(finalArchivePath);
          }
          await fs.promises.rename(tempArchivePath, finalArchivePath);
          this.logger.log(
            `[_createArchive] Archive successfully created: ${finalArchivePath}, size: ${archive.pointer()} bytes`,
          );
          operationCleanup(true, finalArchivePath);
        } catch (renameError) {
          this.logger.error("[_createArchive] Error renaming temporary archive file:", renameError);
          operationCleanup(false, null, renameError);
        }
      });

      output.on("error", (err) => {
        this.logger.error("[_createArchive] Archive output stream error:", err);
        errorOccurredStream = true;
        if (!output.writableFinished) {
          output.destroy();
        }
        operationCleanup(false, null, err);
      });

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          this.logger.warn(`[_createArchive] Archiving warning (ENOENT): ${err.message}`);
        } else {
          this.logger.error("[_createArchive] Archiving warning:", err);
        }
      });

      archive.on("error", (err) => {
        this.logger.error("[_createArchive] Archiving process error (archive.on('error')):", err);
        errorOccurredStream = true;
        if (!output.writableFinished) {
          output.destroy(err instanceof Error ? err : new Error(String(err)));
        }
        operationCleanup(false, null, err);
      });

      try {
        if (!(await this.exists(this.baseFilesPath))) {
          this.logger.warn(
            `[_createArchive] Base directory ${this.baseFilesPath} does not exist. Creating empty archive.`,
          );
        } else {
          const stats = await fs.promises.stat(this.baseFilesPath);
          if (!stats.isDirectory()) {
            this.logger.error(
              `[_createArchive] Base path ${this.baseFilesPath} is not a directory. Creating empty archive.`,
            );
          } else {
            const files = await fs.promises.readdir(this.baseFilesPath);
            if (files.length === 0) {
              this.logger.log("[_createArchive] Base directory is empty. Creating empty archive.");
            } else {
              archive.directory(this.baseFilesPath, false);
            }
          }
        }
        archive.pipe(output);
        await archive.finalize();
      } catch (err: any) {
        this.logger.error("[_createArchive] Error during archive preparation or finalization:", err);
        errorOccurredStream = true;
        if (!output.writableFinished) {
          output.destroy(err instanceof Error ? err : new Error(String(err)));
        }
        operationCleanup(false, null, err);
      }
    });
  }
}
