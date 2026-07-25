import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { IosCard } from '../../components/ui/IosCard';
import { IosHeader } from '../../components/ui/IosHeader';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  specialInstructions: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
  accepted: { label: 'Aceptado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  in_preparation: { label: 'En preparacion', color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
  delivered: { label: 'Entregado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  cancelled: { label: 'Cancelado', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10' },
};

export function EmployeeOrdersPage(): React.JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get<Order[]>('/employee/orders');
      setOrders(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => void fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-[var(--c-text-secondary)] text-center py-8">Cargando pedidos...</p>;
  }

  return (
    <div>
      <IosHeader title="Mis Pedidos" />

      <div className="space-y-3 mt-4">
        {orders.map((order) => {
          const status = (statusConfig[order.orderStatus] ?? statusConfig.pending) as { label: string; color: string; bg: string };
          return (
            <IosCard key={order.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[15px] font-semibold text-[var(--c-text)]">{order.orderNumber}</p>
                  <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--c-separator)]">
                <p className="text-[13px] text-[var(--c-text-secondary)]">
                  Pago: {order.paymentStatus === 'paid' ? 'Pagado' : order.paymentStatus === 'payroll_deduction' ? 'Descuento de nomina' : 'Pendiente'}
                </p>
                <p className="text-[17px] font-bold text-[var(--c-accent)]">
                  ${order.totalAmount.toFixed(2)}
                </p>
              </div>
              {order.specialInstructions && (
                <p className="text-[12px] text-[var(--c-text-secondary)] mt-2 italic">
                  "{order.specialInstructions}"
                </p>
              )}
            </IosCard>
          );
        })}

        {orders.length === 0 && (
          <p className="text-[var(--c-text-secondary)] text-center py-8">
            No tienes pedidos aun.
          </p>
        )}
      </div>
    </div>
  );
}
