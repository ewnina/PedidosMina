export class WhatsappMessageFactory {
  static newOrderNotification(data: {
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
    serviceName: string;
    totalAmount: number;
    specialInstructions?: string;
  }): string {
    let msg = `\u{1F37D}\uFE0F *Nuevo Pedido*\n\n`;
    msg += `\u{1F4CB} #${data.orderNumber}\n`;
    msg += `\u{1F464} ${data.employeeName}\n`;
    msg += `\u{1F4DE} ${data.employeePhone}\n`;
    msg += `\u{1F957} ${data.serviceName}\n`;
    msg += `\u{1F4B0} $${data.totalAmount.toFixed(2)}\n`;

    if (data.specialInstructions) {
      msg += `\n\u{1F4DD} *Instrucciones:* ${data.specialInstructions}`;
    }

    msg += `\n\n\u2705 Acepta o rechaza desde el panel.`;
    return msg;
  }

  static orderAccepted(data: { orderNumber: string; employeeName: string }): string {
    return `\u2705 Pedido #${data.orderNumber} confirmado para ${data.employeeName}.`;
  }

  static orderCancelled(data: { orderNumber: string; employeeName: string }): string {
    return `\u274C Pedido #${data.orderNumber} cancelado para ${data.employeeName}.`;
  }
}
