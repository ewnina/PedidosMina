import { OrderItemDetail } from '../orders/events/order-created.event';

export class MessageFactory {
  static newOrderNotification(data: {
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
    serviceName: string;
    totalAmount: number;
    specialInstructions?: string;
    deliveryZoneName: string;
    items?: OrderItemDetail[];
  }): string {
    let msg = `🍽️ *Nuevo Pedido*\n\n`;
    msg += `📋 #${data.orderNumber}\n`;
    msg += `👤 ${data.employeeName}\n`;
    msg += `📞 ${data.employeePhone}\n`;
    msg += `📍 ${data.deliveryZoneName}\n`;
    msg += `💰 $${Number(data.totalAmount).toFixed(2)}\n`;

    if (data.items && data.items.length > 0) {
      msg += `\n--- Detalle ---\n`;
      for (const item of data.items) {
        msg += `\n🥗 *${item.serviceName}* x${item.quantity}`;
        if (item.selections && item.selections.length > 0) {
          const grouped: Record<string, string[]> = {};
          for (const sel of item.selections) {
            const arr = grouped[sel.groupName];
            if (arr) {
              arr.push(sel.optionName);
            } else {
              grouped[sel.groupName] = [sel.optionName];
            }
          }
          for (const [group, options] of Object.entries(grouped)) {
            msg += `\n   • ${group}: ${options.join(', ')}`;
          }
        }
      }
    }

    if (data.specialInstructions) {
      msg += `\n\n📝 *Instrucciones:* ${data.specialInstructions}`;
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
