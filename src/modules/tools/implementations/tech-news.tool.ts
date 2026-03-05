import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { ITool, ToolResult } from '../interfaces/tool.interface';

interface NewsItem {
    title: string;
    source: string;
    url: string;
}

@Injectable()
export class TechNewsTool implements ITool {
    readonly name = 'get_tech_news';
    private readonly logger = new Logger(TechNewsTool.name);

    constructor(private readonly httpService: HttpService) { }

    async execute(args: Record<string, any>): Promise<ToolResult> {
        const keyword = (args.keyword as string) ?? 'tecnología';

        try {
            const news = await this.scrapeFromGoogleNews(keyword);

            if (!news.length) {
                return {
                    success: false,
                    formattedText: `No encontré noticias recientes sobre "${keyword}".`,
                };
            }

            const formatted = this.formatNews(news, keyword);

            return {
                success: true,
                data: { keyword, news, count: news.length },
                formattedText: formatted,
            };
        } catch (error) {
            this.logger.error('Tech news fetch failed', error?.message);
            return {
                success: false,
                formattedText: `No pude obtener noticias sobre "${keyword}" en este momento.`,
                errorMessage: error?.message,
            };
        }
    }

    // ─── Scraping de Google News RSS (sin API key) ────────────────────────────
    private async scrapeFromGoogleNews(keyword: string): Promise<NewsItem[]> {
        const encoded = encodeURIComponent(keyword);
        const url =
            `https://news.google.com/rss/search?q=${encoded}` +
            `+when:7d&hl=es-419&gl=CO&ceid=CO:es-419`;

        const response = await firstValueFrom(
            this.httpService.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                    Accept: 'application/rss+xml, application/xml',
                },
            }),
        );

        const $ = cheerio.load(response.data, { xmlMode: true });
        const items: NewsItem[] = [];

        $('item').each((i, el) => {
            if (i >= 5) return false; // Solo las 5 primeras noticias

            const title = $(el).find('title').text().trim();
            const source = $(el).find('source').text().trim() || 'Google News';
            const link = $(el).find('link').text().trim() ||
                $(el).find('guid').text().trim();

            if (title) {
                items.push({ title, source, url: link });
            }
        });

        this.logger.log(
            `Found ${items.length} news items for keyword: "${keyword}"`,
        );

        return items;
    }

    // ─── Formatear noticias para WhatsApp ─────────────────────────────────────
    private formatNews(news: NewsItem[], keyword: string): string {
        const lines = news.map(
            (item, i) => `*${i + 1}. ${item.title}*\n_Fuente: ${item.source}_`,
        );

        return (
            `📰 *Noticias sobre "${keyword}":*\n\n` +
            lines.join('\n\n') +
            `\n\n_Resultados de los últimos 7 días_`
        );
    }
}