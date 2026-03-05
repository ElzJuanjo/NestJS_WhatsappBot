import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { ITool, ToolResult } from '../interfaces/tool.interface';

@Injectable()
export class TrmTool implements ITool {
    readonly name = 'get_trm';
    private readonly logger = new Logger(TrmTool.name);

    constructor(private readonly httpService: HttpService) { }

    async execute(_args: Record<string, any>): Promise<ToolResult> {
        try {
            // ── Fuente primaria: API oficial del Banco de la República ────────────
            const result = await this.fetchFromBanRep();
            if (result) return result;

            // ── Fuente secundaria: Scraping de Google Finance ─────────────────────
            return await this.fetchFromGoogle();
        } catch (error) {
            this.logger.error('TRM fetch failed', error?.message);
            return {
                success: false,
                formattedText: 'No se pudo obtener la TRM en este momento.',
                errorMessage: error?.message,
            };
        }
    }

    // ─── Fuente 1: API del Banco de la República ──────────────────────────────
    private async fetchFromBanRep(): Promise<ToolResult | null> {
        try {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const url =
                `https://www.datos.gov.co/resource/mcec-87by.json` +
                `?vigenciadesde=${dateStr}T00:00:00.000&vigenciahasta=${dateStr}T00:00:00.000`;

            const response = await firstValueFrom(
                this.httpService.get(url, { timeout: 8000 }),
            );

            const data = response.data;

            if (!Array.isArray(data) || data.length === 0) return null;

            const trm = parseFloat(data[0].valor);
            const date = data[0].vigenciadesde?.split('T')[0] ?? dateStr;

            this.logger.log(`TRM from BanRep: ${trm}`);

            return {
                success: true,
                data: { trm, date, source: 'Banco de la República' },
                formattedText:
                    `TRM del ${date}: *$${trm.toLocaleString('es-CO')} COP* por 1 USD. ` +
                    `Fuente: Banco de la República de Colombia.`,
            };
        } catch (error) {
            this.logger.warn('BanRep API failed, trying fallback', error?.message);
            return null;
        }
    }

    // ─── Fuente 2: Scraping de Google Finance como fallback ───────────────────
    private async fetchFromGoogle(): Promise<ToolResult> {
        const url = 'https://www.google.com/finance/quote/USD-COP';

        const response = await firstValueFrom(
            this.httpService.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                        'Chrome/120.0.0.0 Safari/537.36',
                },
            }),
        );

        const $ = cheerio.load(response.data);

        // Google Finance guarda el precio en este selector
        const priceText = $('[data-last-price]').attr('data-last-price') ??
            $('.YMlKec.fxKbKc').first().text().trim();

        if (!priceText) {
            throw new Error('Could not extract price from Google Finance');
        }

        const trm = parseFloat(priceText.replace(/,/g, ''));
        const today = new Date().toLocaleDateString('es-CO');

        this.logger.log(`TRM from Google: ${trm}`);

        return {
            success: true,
            data: { trm, date: today, source: 'Google Finance' },
            formattedText:
                `TRM aproximada al ${today}: *$${trm.toLocaleString('es-CO')} COP* por 1 USD. ` +
                `Fuente: Google Finance.`,
        };
    }
}