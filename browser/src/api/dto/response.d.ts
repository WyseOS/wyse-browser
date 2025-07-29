
export declare namespace Common {
    type Response<T = any> = {
        code: number;
        data?: T;
        message: string;
    };

    type PageResponse<T = any> = {
        current?: number;
        size?: number;
        total?: number;
        records: T[];
    };
}
