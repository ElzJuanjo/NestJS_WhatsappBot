export class ConversationHistoryDto {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolName?: string;
}