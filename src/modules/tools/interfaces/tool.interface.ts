export interface ToolResult {
    success: boolean;
    data?: any;
    formattedText: string; 
    errorMessage?: string;
}

export interface ITool {
    name: string;
    execute(args: Record<string, any>): Promise<ToolResult>;
}