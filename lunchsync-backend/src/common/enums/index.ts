export enum OrderStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  InPreparation = 'in_preparation',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export enum PaymentStatus {
  Unpaid = 'unpaid',
  Paid = 'paid',
}

export enum BotStatus {
  Disconnected = 'disconnected',
  Starting = 'starting',
  WaitingQR = 'waiting_qr',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  AuthenticationFailed = 'authentication_failed',
  Stopped = 'stopped',
}
