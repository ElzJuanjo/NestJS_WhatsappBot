import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly phoneNumberId: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.token = this.config.getOrThrow<string>('WHATSAPP_TOKEN');
        this.phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
        this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
    }

    // ─── Enviar mensaje de texto ───────────────────────────────────────────────
    async sendMessage(to: string, message: string): Promise<void> {
        try {
            await firstValueFrom(
                this.httpService.post(
                    this.apiUrl,
                    {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to,
                        type: 'text',
                        text: { body: message },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            this.logger.log(`Message sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send message to ${to}`, error?.response?.data);
            throw error;
        }
    }

    // ─── Enviar mensaje de "escribiendo..." ────────────────────────────────────
    async sendTypingIndicator(to: string): Promise<void> {
        try {
            await firstValueFrom(
                this.httpService.post(
                    this.apiUrl,
                    {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to,
                        type: 'text',
                        text: { body: '⏳ Procesando tu solicitud...' },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );
        } catch {
            // No crítico si falla
        }
    }

    // ─── Extraer datos del payload del webhook ─────────────────────────────────
    extractMessageData(body: any): {
        from: string;
        messageText: string;
        userName: string;
        messageId: string;
    } | null {
        try {
            const entry = body?.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            // Ignorar eventos que no son mensajes
            if (!value?.messages || value.messages.length === 0) {
                return null;
            }

            const message = value.messages[0];

            // Solo procesamos mensajes de texto
            if (message.type !== 'text') {
                return null;
            }

            const from = message.from;
            const messageText = message.text?.body;
            const messageId = message.id;
            const userName = value.contacts?.[0]?.profile?.name ?? 'Usuario';

            if (!from || !messageText) return null;

            return { from, messageText, userName, messageId };
        } catch (error) {
            this.logger.error('Error extracting message data', error);
            return null;
        }
    }
}