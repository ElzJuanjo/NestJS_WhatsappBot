import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    TOOL = 'tool',
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    conversationId: string;

    @ManyToOne(() => Conversation)
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;

    @Column({
        type: 'enum',
        enum: MessageRole,
    })
    role: MessageRole;

    @Column('text')
    content: string;

    @Column({ nullable: true })
    toolName: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;
}