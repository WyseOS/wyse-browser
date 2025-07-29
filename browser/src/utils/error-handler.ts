export class ActionErrorHandler {

    static createActionError(
        action: string,
        sessionId: string,
        originalError: Error,
        params?: any
    ): Error {
        const message = `${originalError.message}`;

        const error = new Error(message);
        error.stack = originalError.stack;
        (error as any).actionName = action;
        (error as any).sessionId = sessionId;
        (error as any).actionParams = params;
        (error as any).originalError = originalError.name;

        return error;
    }


    static createValidationError(
        action: string,
        paramName: string,
        expectedType: string,
        actualValue: any
    ): Error {
        const message = `Action '${action}' parameter validation failed: '${paramName}' expected ${expectedType}, got ${typeof actualValue}`;
        const error = new Error(message);
        (error as any).type = 'ValidationError';
        (error as any).actionName = action;
        (error as any).paramName = paramName;
        (error as any).expectedType = expectedType;
        return error;
    }
} 