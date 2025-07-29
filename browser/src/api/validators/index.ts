import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { MetadataType, MaxFlowNameLength, MinFlowNameLength, MaxWorkletNameLength, MinWorkletNameLength } from '../../constants';

/**
 * Validates name length based on metadata type
 */
@ValidatorConstraint({ name: 'isValidName', async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
    validate(name: string, args: ValidationArguments): boolean {
        const [metadataType] = args.constraints;

        if (!name || typeof name !== 'string') {
            return false;
        }

        if (metadataType === MetadataType.FLOW) {
            return name.length >= MinFlowNameLength && name.length <= MaxFlowNameLength;
        } else if (metadataType === MetadataType.WORKLET) {
            return name.length >= MinWorkletNameLength && name.length <= MaxWorkletNameLength;
        }

        return false;
    }

    defaultMessage(args: ValidationArguments): string {
        const [metadataType] = args.constraints;
        if (metadataType === MetadataType.FLOW) {
            return `Flow name must be between ${MinFlowNameLength} and ${MaxFlowNameLength} characters`;
        } else if (metadataType === MetadataType.WORKLET) {
            return `Worklet name must be between ${MinWorkletNameLength} and ${MaxWorkletNameLength} characters`;
        }
        return 'Invalid name';
    }
}

export function IsValidName(metadataType: MetadataType, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidName',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [metadataType],
            validator: IsValidNameConstraint,
        });
    };
}

/**
 * Validates session ID format (UUID v4)
 */
@ValidatorConstraint({ name: 'isValidSessionId', async: false })
export class IsValidSessionIdConstraint implements ValidatorConstraintInterface {
    validate(sessionId: string): boolean {
        if (!sessionId) return true; // Optional field

        // UUID v4 regex pattern
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(sessionId);
    }

    defaultMessage(): string {
        return 'Session ID must be a valid UUID v4 format';
    }
}

export function IsValidSessionId(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidSessionId',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsValidSessionIdConstraint,
        });
    };
}

/**
 * Validates flow instance ID format
 */
@ValidatorConstraint({ name: 'isValidFlowInstanceId', async: false })
export class IsValidFlowInstanceIdConstraint implements ValidatorConstraintInterface {
    validate(flowInstanceId: string): boolean {
        if (!flowInstanceId || typeof flowInstanceId !== 'string') {
            return false;
        }

        // Basic format validation - should be a non-empty string
        return flowInstanceId.trim().length > 0;
    }

    defaultMessage(): string {
        return 'Flow instance ID must be a non-empty string';
    }
}

export function IsValidFlowInstanceId(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidFlowInstanceId',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsValidFlowInstanceIdConstraint,
        });
    };
}

/**
 * Validates extension names array
 */
@ValidatorConstraint({ name: 'isValidExtensionNames', async: false })
export class IsValidExtensionNamesConstraint implements ValidatorConstraintInterface {
    validate(extensionNames: string[]): boolean {
        if (!extensionNames) return true; // Optional field

        if (!Array.isArray(extensionNames)) {
            return false;
        }

        // All items should be non-empty strings
        return extensionNames.every(name =>
            typeof name === 'string' && name.trim().length > 0
        );
    }

    defaultMessage(): string {
        return 'Extension names must be an array of non-empty strings';
    }
}

export function IsValidExtensionNames(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidExtensionNames',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsValidExtensionNamesConstraint,
        });
    };
} 