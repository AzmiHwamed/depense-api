import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationSource {
    MANUAL = 'manual',
    EVENT = 'event',
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // null userId = broadcast to every registered device
    @Index()
    @Column({
        type: 'varchar',
        nullable: true,
    })
    userId: string | null;

    @Column()
    title: string;

    @Column()
    body: string;

    @Column({
        type: 'json',
        nullable: true,
    })
    data: Record<string, string> | null;

    @Column({ type: 'enum', enum: NotificationSource, default: NotificationSource.MANUAL })
    source: NotificationSource;

    @Column({ default: false })
    read: boolean;

    @Column({ default: false })
    pushSent: boolean;

    @CreateDateColumn()
    createdAt: Date;
}