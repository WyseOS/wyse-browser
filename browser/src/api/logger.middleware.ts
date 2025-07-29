import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(LoggerMiddleware.name);

    use(req: Request, res: Response, next: NextFunction): void {
        let logMessage = `Request URL: ${req.method} ${req.originalUrl}`;
        if (req.method === 'POST') {
            logMessage += `, Body: ${JSON.stringify(req.body)}`;
        } else if (req.method === 'GET') {
            logMessage += `, Params: ${JSON.stringify(req.query)}`;
        }

        this.logger.log(logMessage);
        next();
    }
} 