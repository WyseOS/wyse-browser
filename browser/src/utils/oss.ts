import fs from 'fs';
import OSS from 'ali-oss';
import path from 'path';
import { Logger } from '@nestjs/common';
import { SendAlarm } from './alarm';

export class OSSClient {
    private logger: Logger;
    private client: OSS;
    private urlPrefix: string;

    constructor() {
        this.logger = new Logger(OSSClient.name);
        let config = JSON.parse(fs.readFileSync(path.resolve('..', "configs/engine", "config.json"), "utf8"));
        this.client = new OSS({
            accessKeyId: config.aliyun.access_key,
            accessKeySecret: config.aliyun.access_secret,
            region: config.aliyun.oss_region,
            bucket: config.aliyun.oss_bucket,
            endpoint: config.aliyun.oss_endpoint
        });
        this.urlPrefix = config.aliyun.url;
    }

    async upload(objectKey: string, localFilePath: string): Promise<string> {
        let publicUrl = "";
        try {
            await this.client.put(objectKey, localFilePath);
            publicUrl = this.urlPrefix + objectKey;
            this.logger.log(`upload file to OSS success: ${publicUrl}`);
        } catch (error) {
            this.logger.error(`upload file to OSS fail: ${error}`);
            SendAlarm.sendTextMessage(
                'OSS Upload Failed',
                `Failed to upload object: ${objectKey}\nError: ${error.message}`
            );
            throw new Error(`Failed to upload file to OSS: ${error}`);
        }
        return publicUrl;
    }
}

const ossClientInstance = new OSSClient();

export const OSSUpload = {
    upload: (objectKey: string, localFilePath: string) => ossClientInstance.upload(objectKey, localFilePath)
};