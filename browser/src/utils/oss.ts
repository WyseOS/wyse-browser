import fs from 'fs';
import OSS from 'ali-oss';
import path from 'path';
import { Logger } from '@nestjs/common';

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
}

const ossClientInstance = new OSSClient();

export const OSSUpload = {
    upload: (objectKey: string, localFilePath: string) => ossClientInstance.upload(objectKey, localFilePath)
};