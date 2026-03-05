import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Res,
    HttpCode,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { MessageProcessorService } from './message-processor.service';

@Controller('webhook')
export class WhatsAppController {
    private readonly logger = new Logger(WhatsAppController.name);

    constructor(
        private readonly whatsappService: WhatsAppService,
        private readonly messageProcessor: MessageProcessorService,
        private readonly config: ConfigService,
    ) { }

    // ─── GET: Verificación del webhook con Meta ────────────────────────────────
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        const verifyToken = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            return res.status(200).send(challenge);
        }

        this.logger.warn('Webhook verification failed');
        return res.status(403).json({ error: 'Forbidden' });
    }

    // ─── POST: Recibir mensajes y delegar al orquestador ─────────────────────
    @Post()
    @HttpCode(200) // Meta necesita 200 inmediato o reintenta
    async receiveMessage(@Body() body: any) {
        if (body?.object !== 'whatsapp_business_account') {
            return { status: 'ignored' };
        }

        const messageData = this.whatsappService.extractMessageData(body);
        if (!messageData) return { status: 'ignored' };

        const { from, messageText, userName } = messageData;

        // Procesamos de forma asíncrona para responder 200 a Meta de inmediato
        // Meta espera respuesta en menos de 20 segundos o reintenta
        this.messageProcessor
            .process(from, messageText, userName)
            .catch((err) =>
                this.logger.error('Unhandled processor error', err?.message),
            );

        return { status: 'ok' };
    }
}