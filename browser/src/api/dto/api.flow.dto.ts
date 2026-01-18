import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MetadataType } from '../../constants';
import {
  IsValidName,
  IsValidSessionId,
  IsValidFlowInstanceId,
  IsValidExtensionNames,
} from '../validators';

/**
 * DTO for creating a flow from metadata
 */
export class CreateFlowDto {
  @IsString({ message: 'Flow name must be a string' })
  @IsNotEmpty({ message: 'Flow name cannot be empty' })
  @IsValidName(MetadataType.FLOW)
  readonly flow_name: string;

  @IsOptional()
  @IsString({ message: 'Session ID must be a string' })
  @IsValidSessionId()
  @Transform(({ value }) => value || '')
  readonly session_id: string = '';

  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  @Transform(({ value }) => value || '')
  readonly user_id: string = '';

  @IsOptional()
  @IsBoolean({ message: 'is_save_video must be a boolean' })
  @Transform(({ value }) => value ?? false)
  readonly is_save_video: boolean = false;

  @IsOptional()
  @IsArray({ message: 'Extension names must be an array' })
  @IsValidExtensionNames()
  @Transform(({ value }) => value || [])
  readonly extension_names: string[] = [];
}

/**
 * DTO for deploying a flow with inline definition
 */
export class DeployFlowDto {
  @IsObject({ message: 'Flow must be an object' })
  @IsNotEmpty({ message: 'Flow object cannot be empty' })
  readonly flow: Record<string, any>;

  @IsOptional()
  @IsString({ message: 'Session ID must be a string' })
  @IsValidSessionId()
  @Transform(({ value }) => value || '')
  readonly session_id: string = '';

  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  @Transform(({ value }) => value || '')
  readonly user_id: string = '';

  @IsOptional()
  @IsBoolean({ message: 'is_save_video must be a boolean' })
  @Transform(({ value }) => value ?? false)
  readonly is_save_video: boolean = false;

  @IsOptional()
  @IsArray({ message: 'Extension names must be an array' })
  @IsValidExtensionNames()
  @Transform(({ value }) => value || [])
  readonly extension_names: string[] = [];
}

/**
 * DTO for firing a flow action
 */
export class FireFlowDto {
  @IsString({ message: 'Flow instance ID must be a string' })
  @IsNotEmpty({ message: 'Flow instance ID cannot be empty' })
  @IsValidFlowInstanceId()
  readonly flow_instance_id: string;

  @IsOptional()
  @IsString({ message: 'Action name must be a string' })
  @Transform(({ value }) => value || 'action_flow_start')
  readonly action_name: string = 'action_flow_start';

  @IsObject({ message: 'Data must be an object' })
  @IsNotEmpty({ message: 'Data object cannot be empty' })
  readonly data: any;
}

/**
 * DTO for getting flow progress
 */
export class FlowProgressDto {
  @IsString({ message: 'Flow instance ID must be a string' })
  @IsNotEmpty({ message: 'Flow instance ID cannot be empty' })
  @IsValidFlowInstanceId()
  readonly flow_instance_id: string;
}

/**
 * DTO for canceling a flow
 */
export class CancelFlowDto {
  @IsString({ message: 'Flow instance ID must be a string' })
  @IsNotEmpty({ message: 'Flow instance ID cannot be empty' })
  @IsValidFlowInstanceId()
  readonly flow_instance_id: string;
}

/**
 * DTO for getting metadata
 */
export class GetMetadataDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  readonly name: string;

  @IsEnum(MetadataType, { message: 'Invalid metadata type' })
  readonly metadata_type: MetadataType;
}

/**
 * DTO for updating metadata
 */
export class UpdateMetadataDto {
  @IsEnum(MetadataType, { message: 'Invalid metadata type' })
  readonly metadata_type: MetadataType;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  readonly name: string;

  @IsObject({ message: 'Data must be an object' })
  @IsNotEmpty({ message: 'Data object cannot be empty' })
  readonly data: Record<string, any>;
}
