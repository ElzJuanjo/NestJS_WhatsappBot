import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TOOL_DEFINITIONS, ToolName, VALID_TOOL_NAMES } from './tools.definition';
import { ConversationHistoryDto } from '../conversation/dto/conversation-history.dto';

export interface ToolCallResult {
    shouldUseTool: true;
    toolName: ToolName;
    toolArgs: Record<string, any>;
}

export interface DirectReplyResult {
    shouldUseTool: false;
    reply: string;
}

export type OpenAIDecision = ToolCallResult | DirectReplyResult;

@Injectable()
export class OpenAIService {
    private readonly logger = new Logger(OpenAIService.name);
    private readonly client: OpenAI;
    private readonly model = 'openai/gpt-oss-120b';

    constructor(private readonly config: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.config.get<string>('OPENAI_API_KEY'),
            baseURL: 'https://api.groq.com/openai/v1',
        });
    }

    // ─── Sistema prompt base del bot ──────────────────────────────────────────
    private getSystemPrompt(): string {
        const now = new Date().toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
        });

        return `Eres un asistente virtual inteligente para WhatsApp llamado "BotAsistente".
Fecha y hora actual en Colombia: ${now}

TU PERSONALIDAD:
- Amigable, conciso y útil
- Respondes siempre en español
- Usas emojis con moderación para hacer las respuestas más amigables
- Eres directo: no das rodeos innecesarios

TUS CAPACIDADES:
1. Consultar la TRM (precio del dólar en Colombia)
2. Buscar noticias de tecnología por tema
3. Consultar el clima de cualquier ciudad

REGLAS IMPORTANTES:
- Si el usuario saluda o hace preguntas generales, responde directamente SIN usar herramientas
- SOLO usa herramientas cuando el usuario claramente necesite datos externos
- Si no entiendes la solicitud, pide aclaración amablemente
- Tus respuestas en WhatsApp deben ser cortas y legibles (máximo 3-4 párrafos)
- Usa *negrita* y _cursiva_ con formato WhatsApp cuando sea útil`;
    }

    // ─── Analizar mensaje y decidir si usar tool o responder directo ──────────
    async analyzeAndDecide(
        userMessage: string,
        history: ConversationHistoryDto[],
    ): Promise<OpenAIDecision> {
        try {
            // Construir el array de mensajes para OpenAI
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: this.getSystemPrompt() },
                // Historial previo de la conversación
                ...history.map((h) => ({
                    role: h.role as 'user' | 'assistant',
                    content: h.content,
                })),
                // Mensaje actual del usuario
                { role: 'user', content: userMessage },
            ];

            this.logger.log(`Calling OpenAI with model: ${this.model}`);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                tools: TOOL_DEFINITIONS,
                tool_choice: 'auto', // OpenAI decide si usar tool o no
                max_tokens: 1000,
                temperature: 0.7,
            });

            const choice = response.choices[0];
            const finishReason = choice.finish_reason;

            this.logger.log(`OpenAI finish_reason: ${finishReason}`);

            // ── Caso 1: OpenAI quiere usar una tool ───────────────────────────────
            if (finishReason === 'tool_calls' && choice.message.tool_calls?.length) {
                const toolCall = choice.message.tool_calls[0];

                if (!('function' in toolCall)) {
                    this.logger.warn('Tool call sin propiedad function');
                    return {
                        shouldUseTool: false,
                        reply: 'Lo siento, hubo un problema procesando tu solicitud. 😕',
                    };
                }

                const toolName = toolCall.function.name as ToolName;

                // Validar que la tool existe
                if (!VALID_TOOL_NAMES.includes(toolName)) {
                    this.logger.warn(`Unknown tool requested: ${toolName}`);
                    return {
                        shouldUseTool: false,
                        reply: 'Lo siento, no puedo procesar esa solicitud ahora mismo. 😕',
                    };
                }

                let toolArgs: Record<string, any> = {};
                try {
                    if ('function' in toolCall) {
                        toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                    }
                } catch {
                    this.logger.warn('Failed to parse tool arguments');
                }

                this.logger.log(
                    `Tool call decided: ${toolName} with args: ${JSON.stringify(toolArgs)}`,
                );

                return {
                    shouldUseTool: true,
                    toolName,
                    toolArgs,
                };
            }

            // ── Caso 2: OpenAI responde directamente ─────────────────────────────
            const replyText = choice.message.content;

            if (!replyText) {
                return {
                    shouldUseTool: false,
                    reply: 'No pude generar una respuesta. Por favor intenta de nuevo. 🙏',
                };
            }

            return {
                shouldUseTool: false,
                reply: replyText,
            };
        } catch (error) {
            this.logger.error('OpenAI API error', error?.message);
            throw error;
        }
    }

    // ─── Generar respuesta final con el resultado de la tool ──────────────────
    async generateToolResponse(
        userMessage: string,
        toolName: string,
        toolResult: string,
        history: ConversationHistoryDto[],
    ): Promise<string> {
        try {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: this.getSystemPrompt() },
                ...history.map((h) => ({
                    role: h.role as 'user' | 'assistant',
                    content: h.content,
                })),
                { role: 'user', content: userMessage },
                // Le decimos a OpenAI qué devolvió la tool
                {
                    role: 'assistant',
                    content: `Obtuve los siguientes datos usando la herramienta ${toolName}: ${toolResult}`,
                },
                {
                    role: 'user',
                    content:
                        'Con base en esos datos, redacta una respuesta clara y amigable para WhatsApp.',
                },
            ];

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: 600,
                temperature: 0.7,
            });

            return (
                response.choices[0].message.content ??
                'Aquí están los resultados que encontré. 📊'
            );
        } catch (error) {
            this.logger.error('Error generating tool response', error?.message);
            throw error;
        }
    }
}