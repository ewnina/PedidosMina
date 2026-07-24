export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly providerId: string,
    public readonly dailyMenuId: string,
    public readonly orderData: {
      orderNumber: string;
      employeeName: string;
      employeePhone: string;
      totalAmount: number;
    },
  ) {}
}
