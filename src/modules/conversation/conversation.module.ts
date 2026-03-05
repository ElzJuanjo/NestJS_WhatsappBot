import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../database/entities/conversation.entity';
import { Message } from '../../database/entities/message.entity';
import { ToolExecution } from '../../database/entities/tool-execution.entity';
import { ConversationService } from './conversation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ToolExecution]),
  ],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule { }