import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
    });

    const response = await client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
            { role: 'user', content: '¿Cuánto está el dólar hoy?' },
        ],
        tools: [
            {
                type: 'function',
                function: {
                    name: 'get_trm',
                    description: 'Obtiene el precio del dólar en Colombia',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    },
                },
            },
        ],
        tool_choice: 'auto',
    });

    console.log('finish_reason:', response.choices[0].finish_reason);
    console.log('tool_calls:', response.choices[0].message.tool_calls);
    console.log('content:', response.choices[0].message.content);
}

test().catch(console.error);