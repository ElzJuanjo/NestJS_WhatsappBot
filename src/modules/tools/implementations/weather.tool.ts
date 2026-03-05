import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ITool, ToolResult } from '../interfaces/tool.interface';

@Injectable()
export class WeatherTool implements ITool {
    readonly name = 'get_weather';
    private readonly logger = new Logger(WeatherTool.name);

    constructor(private readonly httpService: HttpService) { }

    async execute(args: Record<string, any>): Promise<ToolResult> {
        const city = (args.city as string) ?? 'Bogotá';

        try {
            const { latitude, longitude, resolvedName } =
                await this.getCoordinates(city);

            const weather = await this.getWeather(latitude, longitude);

            return this.buildResponse(resolvedName, weather);
        } catch (error) {
            this.logger.error('Weather fetch failed', error?.message);
            return {
                success: false,
                formattedText: `No pude obtener el clima de "${city}" en este momento.`,
                errorMessage: error?.message,
            };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Geocoding dinámico
    // ─────────────────────────────────────────────────────────────
    private async getCoordinates(city: string): Promise<{
        latitude: number;
        longitude: number;
        resolvedName: string;
    }> {
        const encoded = encodeURIComponent(city);

        const url =
            `https://geocoding-api.open-meteo.com/v1/search?` +
            `name=${encoded}&count=1&language=es&format=json`;

        const response = await firstValueFrom(
            this.httpService.get(url, { timeout: 8000 }),
        );

        const result = response.data?.results?.[0];

        if (!result) {
            throw new Error('Ciudad no encontrada');
        }

        return {
            latitude: result.latitude,
            longitude: result.longitude,
            resolvedName: `${result.name}, ${result.country}`,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Obtener clima actual
    // ─────────────────────────────────────────────────────────────
    private async getWeather(latitude: number, longitude: number) {
        const url =
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${latitude}&longitude=${longitude}` +
            `&current_weather=true&hourly=relativehumidity_2m&timezone=auto`;

        const response = await firstValueFrom(
            this.httpService.get(url, { timeout: 8000 }),
        );

        const data = response.data;

        if (!data?.current_weather) {
            throw new Error('No weather data returned');
        }

        return data;
    }

    // ─────────────────────────────────────────────────────────────
    // Formateo
    // ─────────────────────────────────────────────────────────────
    private buildResponse(city: string, weatherData: any): ToolResult {
        const current = weatherData.current_weather;

        const tempC = current.temperature;
        const windSpeed = current.windspeed;

        // humedad viene en hourly
        const humidity =
            weatherData.hourly?.relativehumidity_2m?.[0] ?? 'N/A';

        const emoji = this.getTempEmoji(tempC);

        this.logger.log(`Weather for ${city}: ${tempC}°C`);

        const formattedText =
            `${emoji} *Clima en ${city}:*\n` +
            `🌡️ Temperatura: *${tempC}°C*\n` +
            `💧 Humedad: ${humidity}%\n` +
            `💨 Viento: ${windSpeed} km/h`;

        return {
            success: true,
            data: { city, tempC, humidity, windSpeed },
            formattedText,
        };
    }

    private getTempEmoji(temp: number): string {
        if (temp >= 30) return '🔥';
        if (temp >= 20) return '☀️';
        if (temp >= 10) return '🌤️';
        return '🥶';
    }
}