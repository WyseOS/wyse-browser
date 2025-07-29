import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

import { responseMessage } from '@/api/dto/response.dto';

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const statusCode = exception.getStatus();
        response.status(statusCode).json(responseMessage(null, exception.message, statusCode));
    }
}