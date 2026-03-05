import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrmTool } from './implementations/trm.tool';
import { TechNewsTool } from './implementations/tech-news.tool';
import { WeatherTool } from './implementations/weather.tool';
import { ITool, ToolResult } from './interfaces/tool.interface';

@Injectable()
export class ToolsRegistry implements OnModuleInit {
    private readonly logger = new Logger(ToolsRegistry.name);
    private readonly tools = new Map<string, ITool>();

    constructor(
        private readonly trmTool: TrmTool,
        private readonly techNewsTool: TechNewsTool,
        private readonly weatherTool: WeatherTool,
    ) { }

    // Se ejecuta automáticamente cuando NestJS inicializa el módulo
    onModuleInit() {
        this.register(this.trmTool);
        this.register(this.techNewsTool);
        this.register(this.weatherTool);
        this.logger.log(
            `Tools registered: ${Array.from(this.tools.keys()).join(', ')}`,
        );
    }

    private register(tool: ITool) {
        this.tools.set(tool.name, tool);
    }

    // ─── Ejecutar una tool por nombre ─────────────────────────────────────────
    async execute(
        toolName: string,
        args: Record<string, any>,
    ): Promise<ToolResult> {
        const tool = this.tools.get(toolName);

        if (!tool) {
            this.logger.warn(`Tool not found: ${toolName}`);
            return {
                success: false,
                formattedText: `La herramienta "${toolName}" no está disponible.`,
                errorMessage: `Tool "${toolName}" not registered`,
            };
        }

        this.logger.log(`Executing tool: ${toolName} with args: ${JSON.stringify(args)}`);

        try {
            const result = await tool.execute(args);
            this.logger.log(
                `Tool ${toolName} completed - success: ${result.success}`,
            );
            return result;
        } catch (error) {
            this.logger.error(`Tool ${toolName} threw an error`, error?.message);
            return {
                success: false,
                formattedText: 'Ocurrió un error ejecutando la herramienta.',
                errorMessage: error?.message,
            };
        }
    }

    getRegisteredTools(): string[] {
        return Array.from(this.tools.keys());
    }
}