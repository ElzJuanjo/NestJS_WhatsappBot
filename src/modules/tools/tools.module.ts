import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrmTool } from './implementations/trm.tool';
import { TechNewsTool } from './implementations/tech-news.tool';
import { WeatherTool } from './implementations/weather.tool';
import { ToolsRegistry } from './tools.registry';

@Module({
    imports: [
        HttpModule.register({
            timeout: 12000,
            maxRedirects: 5,
        }),
    ],
    providers: [
        TrmTool,
        TechNewsTool,
        WeatherTool,
        ToolsRegistry,
    ],
    exports: [ToolsRegistry],
})
export class ToolsModule { }