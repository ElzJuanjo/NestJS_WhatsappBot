import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('tool_executions')
export class ToolExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    toolName: string;

    @Column({ type: 'jsonb', nullable: true })
    input: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    output: Record<string, any>;

    @Column({ default: true })
    success: boolean;

    @Column({ nullable: true, type: 'text' })
    errorMessage: string;

    @Column()
    phoneNumber: string;

    @CreateDateColumn()
    executedAt: Date;
}