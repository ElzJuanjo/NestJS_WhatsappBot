import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { MessageRole } from '../../../database/entities/message.entity';

export class CreateMessageDto {
    @IsString()
    phoneNumber: string;

    @IsEnum(MessageRole)
    role: MessageRole;

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    toolName?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}