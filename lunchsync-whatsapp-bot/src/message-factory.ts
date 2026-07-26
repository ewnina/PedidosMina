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

export class WhatsappMessageFactory {
  static newOrderNotification(data: {
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
    serviceName: string;
    totalAmount: number;
    specialInstructions?: string;
    items?: OrderItemDetail[];
  }): string {
    let msg = `\u{1F37D}\uFE0F *Nuevo Pedido*\n\n`;
    msg += `\u{1F4CB} #${data.orderNumber}\n`;
    msg += `\u{1F464} ${data.employeeName}\n`;
    msg += `\u{1F4DE} ${data.employeePhone}\n`;
    msg += `\u{1F4B0} $${data.totalAmount.toFixed(2)}\n`;

    if (data.items && data.items.length > 0) {
      msg += `\n--- Detalle ---\n`;
      for (const item of data.items) {
        msg += `\n\u{1F957} *${item.serviceName}* x${item.quantity}`;
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
            msg += `\n   \u2022 ${group}: ${options.join(', ')}`;
          }
        }
      }
    }

    if (data.specialInstructions) {
      msg += `\n\n\u{1F4DD} *Instrucciones:* ${data.specialInstructions}`;
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
