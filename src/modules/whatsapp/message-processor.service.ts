import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { OpenAIService } from '../openai/openai.service';
import { ToolsRegistry } from '../tools/tools.registry';
import { ConversationService } from '../conversation/conversation.service';
import { MessageRole } from '../../database/entities/message.entity';

@Injectable()
export class MessageProcessorService {
    private readonly logger = new Logger(MessageProcessorService.name);

    constructor(
        private readonly whatsappService: WhatsAppService,
        private readonly openaiService: OpenAIService,
        private readonly toolsRegistry: ToolsRegistry,
        private readonly conversationService: ConversationService,
    ) { }

    // ─── Punto de entrada: procesa un mensaje entrante end-to-end ─────────────
    async process(
        phoneNumber: string,
        messageText: string,
        userName: string,
    ): Promise<void> {
        try {
            // ── 1. Persistir mensaje del usuario ──────────────────────────────────
            await this.conversationService.getOrCreateConversation(
                phoneNumber,
                userName,
            );
            await this.conversationService.saveMessage({
                phoneNumber,
                role: MessageRole.USER,
                content: messageText,
            });

            // ── 2. Comandos especiales (sin pasar por OpenAI) ─────────────────────
            const specialResponse = this.handleSpecialCommands(messageText);
            if (specialResponse) {
                await this.sendAndSave(phoneNumber, specialResponse);
                return;
            }

            // ── 3. Obtener historial reciente para contexto ───────────────────────
            const history = await this.conversationService.getRecentHistory(
                phoneNumber,
            );

            // ── 4. OpenAI analiza y decide ────────────────────────────────────────
            this.logger.log(`Processing message from ${phoneNumber}: "${messageText}"`);
            const decision = await this.openaiService.analyzeAndDecide(
                messageText,
                history,
            );

            // ── 5a. Respuesta directa de OpenAI ───────────────────────────────────
            if (!decision.shouldUseTool) {
                await this.sendAndSave(phoneNumber, decision.reply);
                return;
            }

            // ── 5b. Flujo con tool ────────────────────────────────────────────────
            const { toolName, toolArgs } = decision;

            this.logger.log(`Tool selected: ${toolName}`);

            // Notificar al usuario que estamos procesando
            await this.whatsappService.sendMessage(
                phoneNumber,
                '⏳ Consultando información, un momento...',
            );

            // Ejecutar la tool
            const toolResult = await this.toolsRegistry.execute(toolName, toolArgs);

            // Guardar log de ejecución
            await this.conversationService.saveToolExecution({
                toolName,
                input: toolArgs,
                output: toolResult.data ?? {},
                success: toolResult.success,
                errorMessage: toolResult.errorMessage,
                phoneNumber,
            });

            // Si la tool falló, responder con el mensaje de error formateado
            if (!toolResult.success) {
                await this.sendAndSave(phoneNumber, toolResult.formattedText);
                return;
            }

            // ── 6. OpenAI redacta respuesta final con datos de la tool ────────────
            const finalReply = await this.openaiService.generateToolResponse(
                messageText,
                toolName,
                toolResult.formattedText,
                history,
            );

            await this.sendAndSave(phoneNumber, finalReply);
        } catch (error) {
            this.logger.error(
                `Error processing message from ${phoneNumber}`,
                error?.message,
            );

            // Siempre responder al usuario, nunca dejar un mensaje sin respuesta
            await this.sendAndSave(
                phoneNumber,
                '😕 Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
            );
        }
    }

    // ─── Comandos especiales que no requieren OpenAI ──────────────────────────
    private handleSpecialCommands(text: string): string | null {
        const normalized = text.trim().toLowerCase();

        const commands: Record<string, string> = {
            '/ayuda': this.getHelpMessage(),
            '/help': this.getHelpMessage(),
            '/start': this.getWelcomeMessage(),
            '/hola': this.getWelcomeMessage(),
        };

        return commands[normalized] ?? null;
    }

    private getWelcomeMessage(): string {
        return (
            `👋 ¡Hola! Soy *BotAsistente*, tu asistente virtual.\n\n` +
            `Puedo ayudarte con:\n` +
            `💵 *Precio del dólar* — "¿Cuánto está el dólar?"\n` +
            `📰 *Noticias tech* — "Noticias de inteligencia artificial"\n` +
            `🌤️ *Clima* — "¿Cómo está el clima en Medellín?"\n\n` +
            `También puedo responder preguntas generales.\n` +
            `Escribe */ayuda* para más información.`
        );
    }

    private getHelpMessage(): string {
        return (
            `📖 *Comandos disponibles:*\n\n` +
            `*/start* o */hola* — Mensaje de bienvenida\n` +
            `*/ayuda* — Este mensaje\n\n` +
            `*Ejemplos de preguntas:*\n` +
            `• ¿Cuánto está el dólar hoy?\n` +
            `• Noticias de ciberseguridad\n` +
            `• ¿Qué temperatura hace en Cali?\n` +
            `• ¿Qué es la computación cuántica?`
        );
    }

    // ─── Helper: enviar y persistir respuesta del bot ─────────────────────────
    private async sendAndSave(
        phoneNumber: string,
        message: string,
    ): Promise<void> {
        await Promise.all([
            this.whatsappService.sendMessage(phoneNumber, message),
            this.conversationService.saveMessage({
                phoneNumber,
                role: MessageRole.ASSISTANT,
                content: message,
            }),
        ]);
    }
}