export class WhatsAppMessageValueDto {
    messaging_product: string;
    metadata: {
        display_phone_number: string;
        phone_number_id: string;
    };
    contacts?: Array<{
        profile: { name: string };
        wa_id: string;
    }>;
    messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
    }>;
    statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
    }>;
}

export class WhatsAppEntryDto {
    id: string;
    changes: Array<{
        value: WhatsAppMessageValueDto;
        field: string;
    }>;
}

export class WhatsAppWebhookDto {
    object: string;
    entry: WhatsAppEntryDto[];
}