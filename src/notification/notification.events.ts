export const NOTIFICATION_EVENT = 'notification.dispatch';

export class NotificationDispatchEvent {
  constructor(
    public readonly title: string,
    public readonly body: string,
    public readonly userId?: string, // omit to broadcast
    public readonly data?: Record<string, string>,
  ) {}
}