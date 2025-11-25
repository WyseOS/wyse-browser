import fs from 'fs';
import OSS from 'ali-oss';
import path from 'path';
import { Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { FILE_CONSTANTS } from '../constants';

export class OSSClient {
    private logger: Logger;
    private client: OSS | null;
    private urlPrefix: string;

    constructor() {
        this.logger = new Logger(OSSClient.name);
        let config: any = null;
        try {
            const configPath = path.resolve('..', "configs/browser", "config.json");
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, "utf8"));
            }
        } catch (readErr) {
            this.logger.warn(`Failed to read OSS config: ${readErr?.message ?? readErr}`);
        }

        const hasAliyun = !!(config && config.aliyun);
        const hasKeys = hasAliyun && config.aliyun.access_key && config.aliyun.access_secret && config.aliyun.oss_region && config.aliyun.oss_bucket && config.aliyun.oss_endpoint && config.aliyun.url;

        if (hasKeys) {
            this.client = new OSS({
                accessKeyId: config.aliyun.access_key,
                accessKeySecret: config.aliyun.access_secret,
                region: config.aliyun.oss_region,
                bucket: config.aliyun.oss_bucket,
                endpoint: config.aliyun.oss_endpoint
            });
            this.urlPrefix = config.aliyun.url;
        } else {
            this.client = null;
            this.urlPrefix = '';
            this.logger.warn('Aliyun OSS keys missing or incomplete, OSS client disabled');
        }
    }

    async upload(objectKey: string, localFilePath: string): Promise<string> {
        let publicUrl = "";
        if (!this.client) {
            const msg = 'OSS client is disabled due to missing configurations';
            this.logger.warn(msg);
        } else {
            await this.client.put(objectKey, localFilePath);
            publicUrl = this.urlPrefix + objectKey;
            this.logger.log(`upload file to OSS success: ${publicUrl}`);
        }
        return publicUrl;
    }

    getSessionPath(sessionId: string): string {
        return `${FILE_CONSTANTS.OSS_SESSION_PATH_PREFIX}/${sessionId}/`;
    }

    getObjectPath(sessionId: string, filename: string): string {
        return `${this.getSessionPath(sessionId)}${filename}`;
    }

    async putStream(
        objectPath: string,
        stream: Readable,
        contentType?: string
    ): Promise<{ url: string; result: OSS.PutObjectResult }> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            const options: OSS.PutObjectOptions = {};
            if (contentType) {
                options.headers = { 'Content-Type': contentType };
            }

            const result = await this.client.putStream(objectPath, stream, options);
            const publicUrl = this.urlPrefix + objectPath;

            this.logger.log(`File uploaded to OSS: ${publicUrl}`);
            return { url: publicUrl, result };

        } catch (error) {
            this.logger.error(`OSS upload failed: ${objectPath}, error: ${error.message}`);
            throw new Error(`OSS upload failed: ${error.message}`);
        }
    }

    async listSessionFiles(sessionId: string): Promise<OSS.ObjectMeta[]> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            const prefix = this.getSessionPath(sessionId);
            const result = await this.client.list({
                prefix,
                'max-keys': 1000,
            });

            return result.objects || [];

        } catch (error) {
            this.logger.error(`Failed to list files: ${sessionId}, error: ${error.message}`);
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    async getStream(objectPath: string): Promise<Readable> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            const result = await this.client.getStream(objectPath);
            return result.stream;

        } catch (error) {
            this.logger.error(`Failed to get stream: ${objectPath}, error: ${error.message}`);
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }

    async head(objectPath: string): Promise<OSS.HeadObjectResult> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            return await this.client.head(objectPath);

        } catch (error) {
            if (error.code === 'NoSuchKey') {
                throw new Error('File not found');
            }
            this.logger.error(`Failed to head: ${objectPath}, error: ${error.message}`);
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }

    async deleteFile(objectPath: string): Promise<void> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            await this.client.delete(objectPath);
            this.logger.log(`File deleted from OSS: ${objectPath}`);

        } catch (error) {
            this.logger.error(`Failed to delete: ${objectPath}, error: ${error.message}`);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async deleteSessionFiles(sessionId: string): Promise<number> {
        if (!this.client) {
            throw new Error('OSS client is disabled');
        }

        try {
            const files = await this.listSessionFiles(sessionId);

            if (files.length === 0) {
                return 0;
            }

            const keys = files.map(f => f.name);
            await this.client.deleteMulti(keys, { quiet: true });

            this.logger.log(`Deleted ${keys.length} files for session: ${sessionId}`);
            return keys.length;

        } catch (error) {
            this.logger.error(`Failed to delete session files: ${sessionId}, error: ${error.message}`);
            throw new Error(`Failed to delete session files: ${error.message}`);
        }
    }

    async getSessionStorageSize(sessionId: string): Promise<number> {
        if (!this.client) {
            return 0;
        }

        try {
            const files = await this.listSessionFiles(sessionId);
            return files.reduce((total, file) => total + (file.size || 0), 0);

        } catch (error) {
            this.logger.error(`Failed to calculate storage size: ${sessionId}, error: ${error.message}`);
            return 0;
        }
    }

    getPublicUrl(objectPath: string): string {
        return this.urlPrefix + objectPath;
    }
}

const ossClientInstance = new OSSClient();

export const OSSUpload = {
    upload: (objectKey: string, localFilePath: string) => ossClientInstance.upload(objectKey, localFilePath),
    putStream: (objectPath: string, stream: Readable, contentType?: string) =>
        ossClientInstance.putStream(objectPath, stream, contentType),
    listSessionFiles: (sessionId: string) => ossClientInstance.listSessionFiles(sessionId),
    getStream: (objectPath: string) => ossClientInstance.getStream(objectPath),
    head: (objectPath: string) => ossClientInstance.head(objectPath),
    deleteFile: (objectPath: string) => ossClientInstance.deleteFile(objectPath),
    deleteSessionFiles: (sessionId: string) => ossClientInstance.deleteSessionFiles(sessionId),
    getSessionStorageSize: (sessionId: string) => ossClientInstance.getSessionStorageSize(sessionId),
    getPublicUrl: (objectPath: string) => ossClientInstance.getPublicUrl(objectPath),
    getSessionPath: (sessionId: string) => ossClientInstance.getSessionPath(sessionId),
    getObjectPath: (sessionId: string, filename: string) =>
        ossClientInstance.getObjectPath(sessionId, filename),
};