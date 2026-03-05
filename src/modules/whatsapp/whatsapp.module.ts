import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { MessageProcessorService } from './message-processor.service';
import { ConversationModule } from '../conversation/conversation.module';
import { OpenAIModule } from '../openai/openai.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
    imports: [
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 3,
        }),
        ConversationModule,
        OpenAIModule,
        ToolsModule,
    ],
    controllers: [WhatsAppController],
    providers: [WhatsAppService, MessageProcessorService],
    exports: [WhatsAppService],
})
export class WhatsAppModule { }