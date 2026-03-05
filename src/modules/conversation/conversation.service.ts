import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../database/entities/conversation.entity';
import { Message, MessageRole } from '../../database/entities/message.entity';
import { ToolExecution } from '../../database/entities/tool-execution.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationHistoryDto } from './dto/conversation-history.dto';

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);

    // Máximo de mensajes del historial que enviamos a OpenAI
    // para no exceder el context window
    private readonly MAX_HISTORY = 10;

    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepo: Repository<Conversation>,

        @InjectRepository(Message)
        private readonly messageRepo: Repository<Message>,

        @InjectRepository(ToolExecution)
        private readonly toolExecutionRepo: Repository<ToolExecution>,
    ) { }

    // ─── Obtener o crear conversación por número de teléfono ──────────────────
    async getOrCreateConversation(
        phoneNumber: string,
        userName?: string,
    ): Promise<Conversation> {
        let conversation = await this.conversationRepo.findOne({
            where: { phoneNumber },
        });

        if (!conversation) {
            conversation = this.conversationRepo.create({
                phoneNumber,
                userName: userName ?? 'Usuario',
            });
            await this.conversationRepo.save(conversation);
            this.logger.log(`New conversation created for ${phoneNumber}`);
        } else if (userName && conversation.userName !== userName) {
            // Actualizar nombre si cambió
            conversation.userName = userName;
            await this.conversationRepo.save(conversation);
        }

        return conversation;
    }

    // ─── Guardar un mensaje ────────────────────────────────────────────────────
    async saveMessage(dto: CreateMessageDto): Promise<Message> {
        const conversation = await this.getOrCreateConversation(dto.phoneNumber);

        const message = this.messageRepo.create({
            conversationId: conversation.id,
            role: dto.role,
            content: dto.content,
            toolName: dto.toolName,
            metadata: dto.metadata,
        });

        const saved = await this.messageRepo.save(message);
        this.logger.log(
            `Message saved - role: ${dto.role}, phone: ${dto.phoneNumber}`,
        );

        return saved;
    }

    // ─── Obtener historial reciente para enviar a OpenAI ──────────────────────
    async getRecentHistory(
        phoneNumber: string,
    ): Promise<ConversationHistoryDto[]> {
        const conversation = await this.conversationRepo.findOne({
            where: { phoneNumber },
        });

        if (!conversation) return [];

        const messages = await this.messageRepo.find({
            where: { conversationId: conversation.id },
            order: { createdAt: 'DESC' },
            take: this.MAX_HISTORY,
        });

        // Invertir para orden cronológico (más antiguo primero)
        return messages.reverse().map((msg) => ({
            role: msg.role as 'user' | 'assistant' | 'tool',
            content: msg.content,
            toolName: msg.toolName,
        }));
    }

    // ─── Guardar ejecución de herramienta ─────────────────────────────────────
    async saveToolExecution(data: {
        toolName: string;
        input: Record<string, any>;
        output: Record<string, any>;
        success: boolean;
        errorMessage?: string;
        phoneNumber: string;
    }): Promise<ToolExecution> {
        const execution = this.toolExecutionRepo.create(data);
        return this.toolExecutionRepo.save(execution);
    }

    // ─── Obtener estadísticas de una conversación ─────────────────────────────
    async getConversationStats(phoneNumber: string): Promise<{
        totalMessages: number;
        userName: string;
        firstContact: Date;
    } | null> {
        const conversation = await this.conversationRepo.findOne({
            where: { phoneNumber },
        });

        if (!conversation) return null;

        const totalMessages = await this.messageRepo.count({
            where: { conversationId: conversation.id },
        });

        return {
            totalMessages,
            userName: conversation.userName,
            firstContact: conversation.createdAt,
        };
    }

    // ─── Limpiar historial de una conversación ────────────────────────────────
    async clearHistory(phoneNumber: string): Promise<void> {
        const conversation = await this.conversationRepo.findOne({
            where: { phoneNumber },
        });

        if (!conversation) return;

        await this.messageRepo.delete({ conversationId: conversation.id });
        this.logger.log(`History cleared for ${phoneNumber}`);
    }
}