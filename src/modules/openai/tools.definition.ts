import OpenAI from 'openai';

// Tipo que usa el SDK de OpenAI para definir tools
export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_trm',
            description:
                'Obtiene la TRM actual (Tasa Representativa del Mercado): ' +
                'el precio oficial del dólar estadounidense en pesos colombianos (COP). ' +
                'Úsala cuando el usuario pregunte por el precio del dólar, la tasa de cambio, ' +
                'o cuánto vale el dólar hoy.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_tech_news',
            description:
                'Busca y obtiene noticias recientes de tecnología por palabra clave. ' +
                'Úsala cuando el usuario pida noticias, novedades o información reciente ' +
                'sobre un tema tecnológico específico.',
            parameters: {
                type: 'object',
                properties: {
                    keyword: {
                        type: 'string',
                        description:
                            'Palabra clave o tema para buscar noticias. Ejemplo: "inteligencia artificial", "iPhone", "ciberseguridad"',
                    },
                },
                required: ['keyword'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description:
                'Obtiene el clima actual de una ciudad. ' +
                'Úsala cuando el usuario pregunte por el clima, temperatura o tiempo atmosférico.',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'Nombre de la ciudad. Ejemplo: "Bogotá", "Medellín"',
                    },
                },
                required: ['city'],
            },
        },
    },
];

// Nombres válidos de tools — usado para validación
export type ToolName = 'get_trm' | 'get_tech_news' | 'get_weather';

export const VALID_TOOL_NAMES: ToolName[] = [
    'get_trm',
    'get_tech_news',
    'get_weather',
];