export enum RESPONSE_CODE {
    ERROR = -1,
    SUCCESS = 0,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500,
}

export enum RESPONSE_MSG {
    SUCCESS = 'success',
    FAILURE = 'fail',
    NOT_FOUND = 'not found',
    BAD_REQUEST = 'bad request',
    INTERNAL_ERROR = 'internal error',
}

import type { Common } from '@/api/dto/response';

export const responseMessage = <T = any>(
    data,
    message: string = RESPONSE_MSG.SUCCESS,
    code: number = RESPONSE_CODE.SUCCESS,
): Common.Response<T> => ({
    code,
    message,
    data,
});

export const responseNotFound = <T = any>(
    data,
    message: string = RESPONSE_MSG.NOT_FOUND,
    code: number = RESPONSE_CODE.NOT_FOUND,
): Common.Response<T> => ({
    code,
    message,
    data,
});

export const responseBadRequest = <T = any>(
    data,
    message: string = RESPONSE_MSG.BAD_REQUEST,
    code: number = RESPONSE_CODE.BAD_REQUEST,
): Common.Response<T> => ({
    code,
    message,
    data,
});

export const responseInternalError = <T = any>(
    data,
    message: string = RESPONSE_MSG.INTERNAL_ERROR,
    code: number = RESPONSE_CODE.INTERNAL_ERROR,
): Common.Response<T> => ({
    code,
    message,
    data,
});

export class Response {
    code: number;
    message: string;
    data?: any;
}
