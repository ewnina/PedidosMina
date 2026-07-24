export class MessageFactory {
  static newOrderNotification(data: {
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
    serviceName: string;
    totalAmount: number;
    specialInstructions?: string;
  }): string {
    let msg = `🍽️ *Nuevo Pedido*\n\n`;
    msg += `📋 #${data.orderNumber}\n`;
    msg += `👤 ${data.employeeName}\n`;
    msg += `📞 ${data.employeePhone}\n`;
    msg += `🥗 ${data.serviceName}\n`;
    msg += `💰 $${data.totalAmount.toFixed(2)}\n`;

    if (data.specialInstructions) {
      msg += `\n📝 *Instrucciones:* ${data.specialInstructions}`;
    }

    msg += `\n\n✅ Acepta o rechaza desde el panel.`;
    return msg;
  }

  static orderAccepted(data: { orderNumber: string; employeeName: string }): string {
    return `✅ Pedido #${data.orderNumber} confirmado para ${data.employeeName}.`;
  }

  static orderCancelled(data: { orderNumber: string; employeeName: string }): string {
    return `❌ Pedido #${data.orderNumber} cancelado para ${data.employeeName}.`;
  }
}
