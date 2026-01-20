import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { responseMessage } from '@/api/dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const statusCode =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof Error ? exception.message : String(exception);
        response.status(statusCode).json(responseMessage(null, message, statusCode));
    }
}