import { Transform, Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { IsValidSessionId } from '../validators';

/**
 * Browser actions DTO with comprehensive validation
 * @class BrowserActionDto
 * @property {string} session_id - The unique identifier of the browser session
 * @property {number} [page_id] - Optional page identifier within the session. Defaults to 0 if not provided
 * @property {string} action_name - The name of the action to be performed (e.g., 'click', 'type', 'navigate')
 * @property {any} data - The data required for the action execution. Structure depends on the action_name
 */
export class BrowserActionDto {
    @IsString({ message: 'Session ID must be a string' })
    @IsNotEmpty({ message: 'Session ID cannot be empty' })
    @IsValidSessionId()
    readonly session_id: string;

    @IsOptional()
    @IsInt({ message: 'Page ID must be an integer' })
    @Min(0, { message: 'Page ID must be greater than or equal to 0' })
    @Transform(({ value }) => value ?? 0)
    readonly page_id: number = 0;

    @IsString({ message: 'Action name must be a string' })
    @IsNotEmpty({ message: 'Action name cannot be empty' })
    readonly action_name: string;

    @IsNotEmpty({ message: 'Action data cannot be empty' })
    readonly data: any;
}

/**
 * Represents a single action within a batch of actions.
 * @class BatchActionItem
 * @property {string} action_name - The name of the action to be performed (e.g., 'click', 'type', 'navigate')
 * @property {any} data - The data required for the action execution. Structure depends on the action_name
 */
export class BatchActionItem {
    @IsString({ message: 'Action name must be a string' })
    @IsNotEmpty({ message: 'Action name cannot be empty' })
    readonly action_name: string;

    @IsNotEmpty({ message: 'Action data cannot be empty' })
    readonly data: any;
}

export class BatchActionsDto {
    @IsString({ message: 'Session ID must be a string' })
    @IsNotEmpty({ message: 'Session ID cannot be empty' })
    @IsValidSessionId()
    readonly session_id: string;

    @IsOptional()
    @IsInt({ message: 'Page ID must be an integer' })
    @Min(0, { message: 'Page ID must be greater than or equal to 0' })
    @Transform(({ value }) => value ?? 0)
    readonly page_id: number = 0;

    @IsArray({ message: 'Actions must be an array' })
    @ArrayMinSize(1, { message: 'Actions array cannot be empty' })
    @ValidateNested({ each: true })
    @Type(() => BatchActionItem)
    readonly actions: BatchActionItem[];
}