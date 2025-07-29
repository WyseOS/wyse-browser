export class ParameterValidator {
    /**
     * 验证数字参数
     */
    static validateNumber(value: any, paramName: string, min?: number, max?: number): number {
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(`Parameter '${paramName}' must be a valid number, got: ${value}`);
        }
        if (min !== undefined && num < min) {
            throw new Error(`Parameter '${paramName}' must be >= ${min}, got: ${num}`);
        }
        if (max !== undefined && num > max) {
            throw new Error(`Parameter '${paramName}' must be <= ${max}, got: ${num}`);
        }
        return num;
    }

    /**
     * 验证字符串参数
     */
    static validateString(value: any, paramName: string, allowEmpty: boolean = false): string {
        if (typeof value !== 'string') {
            throw new Error(`Parameter '${paramName}' must be a string, got: ${typeof value}`);
        }
        if (!allowEmpty && value.trim().length === 0) {
            throw new Error(`Parameter '${paramName}' cannot be empty`);
        }
        return value;
    }

    /**
     * 验证坐标参数
     */
    static validateCoordinates(x: any, y: any): { x: number; y: number } {
        const validX = this.validateNumber(x, 'x', 0, 10000);
        const validY = this.validateNumber(y, 'y', 0, 10000);
        return { x: validX, y: validY };
    }

    /**
     * 验证元素ID
     */
    static validateElementId(elementId: any): string {
        return this.validateString(elementId, 'element_id', false);
    }

    /**
     * 验证URL参数
     */
    static validateUrl(url: any): string {
        const validUrl = this.validateString(url, 'url', false);
        // 基本URL格式检查
        try {
            new URL(validUrl.startsWith('http') ? validUrl : `https://${validUrl}`);
        } catch {
            throw new Error(`Parameter 'url' is not a valid URL format: ${validUrl}`);
        }
        return validUrl;
    }

    /**
     * 验证时间参数
     */
    static validateTime(time: any): number {
        const validTime = this.validateNumber(time, 'time', 0, 3600); // 最大1小时
        return validTime;
    }

    /**
     * 验证标签页索引
     */
    static validateTabIndex(tabIndex: any): number {
        const validIndex = this.validateNumber(tabIndex, 'tab_index', 0, 50); // 最多50个标签页
        return validIndex;
    }

    /**
     * 验证按键数组
     */
    static validateKeys(keys: any): string[] {
        if (!Array.isArray(keys)) {
            throw new Error(`Parameter 'keys' must be an array, got: ${typeof keys}`);
        }
        if (keys.length === 0) {
            throw new Error(`Parameter 'keys' cannot be empty`);
        }
        for (let i = 0; i < keys.length; i++) {
            if (typeof keys[i] !== 'string') {
                throw new Error(`Key at index ${i} must be a string, got: ${typeof keys[i]}`);
            }
        }
        return keys;
    }

    /**
     * 验证可选的布尔参数
     */
    static validateOptionalBoolean(value: any, paramName: string, defaultValue: boolean = false): boolean {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true') return true;
            if (lowerValue === 'false') return false;
        }
        throw new Error(`Parameter '${paramName}' must be a boolean, got: ${typeof value}`);
    }
} 