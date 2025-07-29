import { ArgumentsHost, Catch, ExceptionFilter, BadRequestException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { responseBadRequest } from '../dto/response.dto';

/**
 * Filter for handling validation exceptions
 * Provides structured error responses for validation failures
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ValidationExceptionFilter.name);

    catch(exception: BadRequestException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        let validationErrors: string[] = [];
        const exceptionResponse = exception.getResponse();

        // Extract validation error messages
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const responseObj = exceptionResponse as any;
            if (responseObj.message && Array.isArray(responseObj.message)) {
                validationErrors = responseObj.message;
            } else if (responseObj.message && typeof responseObj.message === 'string') {
                validationErrors = [responseObj.message];
            }
        }

        // Log the validation error for debugging
        this.logger.warn(`Validation failed for ${request.method} ${request.url}`, {
            errors: validationErrors,
            body: request.body,
            query: request.query,
            params: request.params,
        });

        // Format response using existing response helper
        const errorResponse = responseBadRequest(
            {
                errors: validationErrors,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            },
            validationErrors.length > 0 ? validationErrors.join('; ') : 'Validation failed'
        );

        response.status(exception.getStatus()).json(errorResponse);
    }
} 