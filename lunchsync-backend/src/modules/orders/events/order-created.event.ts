export interface OrderSelectionDetail {
  groupName: string;
  optionName: string;
}

export interface OrderItemDetail {
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selections: OrderSelectionDetail[];
}

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
      serviceName: string;
      specialInstructions: string | null;
      deliveryZoneName: string;
      items: OrderItemDetail[];
    },
  ) {}
}
