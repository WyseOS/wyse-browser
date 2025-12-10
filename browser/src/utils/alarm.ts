import { Logger } from '@nestjs/common';
import axios from 'axios';

const LARK_URL = ""

class LarkMessage {
    readonly msg_type: 'interactive' = 'interactive';
    card: {
        header: {
            title: {
                tag: 'plain_text';
                content: string;
            };
            template: string;
        };
        elements: Array<{
            tag: 'div';
            text: {
                tag: 'plain_text';
                content: string;
            };
        }>;
    };
}

class Alarm {
    private logger: Logger;
    private serviceName: string;
    private larkUrl: string;

    constructor() {
        this.logger = new Logger(Alarm.name);
        this.serviceName = 'WyseEngine';
        this.larkUrl = LARK_URL;
    }

    async sendTextMessage(title: string, msg: string): Promise<void> {
        const message = new LarkMessage();
        message.card = {
            header: {
                title: {
                    tag: 'plain_text',
                    content: title
                },
                template: 'blue'
            },
            elements: [
                {
                    tag: 'div',
                    text: {
                        tag: 'plain_text',
                        content: `Service Name: ${this.serviceName}`
                    }
                },
                {
                    tag: 'div',
                    text: {
                        tag: 'plain_text',
                        content: `Msg: ${msg}`
                    }
                }
            ]
        };
        await this.pushToLark(message);
    }

    private async pushToLark(message: LarkMessage): Promise<void> {
        try {
            if (this.larkUrl == "") {
                this.logger.warn('Lark URL is not set, skipping alarm');
                return;
            }

            const response = await axios.post(this.larkUrl, message, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000  // 添加超时设置
            });

            if (response.status !== 200) {
                this.logger.error(`HTTP request failed with status: ${response.status}`);
            }
        } catch (err) {
            this.logger.error(`Failed to send message to Lark: ${err}`);
        }
    }
}

const alarmInstance = new Alarm();

export const SendAlarm = {
    sendTextMessage: (title: string, msg: string) => alarmInstance.sendTextMessage(title, msg)
};
