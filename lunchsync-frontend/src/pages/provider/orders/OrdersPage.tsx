import React, { useState } from 'react';
import { useOrders } from '../../../hooks/provider/useOrders';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';

const statusColors: Record<string, string> = {
  pending: 'bg-[#FF9500]/10 text-[#FF9500]',
  accepted: 'bg-[#34C759]/10 text-[#34C759]',
  in_preparation: 'bg-[#007AFF]/10 text-[#007AFF]',
  delivered: 'bg-[#AF52DE]/10 text-[#AF52DE]',
  cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30]',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  in_preparation: 'En Preparación',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function OrdersPage(): React.JSX.Element {
  const { orders, loading, updateOrderStatus } = useOrders();
  const [filter, setFilter] = useState('all');

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.orderStatus === filter);

  return (
    <div>
      <IosHeader title="Pedidos" subtitle={`${orders.length} pedidos totales`} />

      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
        {['all', 'pending', 'accepted', 'in_preparation', 'delivered'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-[var(--c-accent)] text-white'
                : 'bg-[var(--c-bg-input)] text-[var(--c-text-secondary)]'
            }`}
          >
            {f === 'all' ? 'Todos' : statusLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[var(--c-text-secondary)]">Cargando pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <IosCard className="text-center py-8">
          <p className="text-[var(--c-text-secondary)] text-[15px]">No hay pedidos {filter !== 'all' ? 'con este estado' : ''}</p>
        </IosCard>
      ) : (
        <div className="space-y-3 mt-4">
          {filteredOrders.map((order) => (
            <IosCard key={order.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-semibold">#{order.orderNumber}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[order.orderStatus] ?? ''}`}>
                      {statusLabels[order.orderStatus] ?? order.orderStatus}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">{order.employeeName} • {order.employeePhone}</p>
                  <p className="text-[13px] text-[var(--c-text-secondary)]">📍 {order.deliveryZoneName}</p>
                </div>
                <span className="text-[17px] font-bold text-[var(--c-accent)]">${order.totalAmount.toFixed(2)}</span>
              </div>

              {order.specialInstructions && (
                <p className="text-[13px] text-[#FF9500] bg-[#FF9500]/5 p-2 rounded-lg mb-2">
                  📝 {order.specialInstructions}
                </p>
              )}

              {order.orderStatus === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <IosButton
                    size="small"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => void updateOrderStatus(order.id, 'cancelled')}
                  >
                    Rechazar
                  </IosButton>
                  <IosButton
                    size="small"
                    className="flex-1"
                    onClick={() => void updateOrderStatus(order.id, 'accepted')}
                  >
                    Aceptar
                  </IosButton>
                </div>
              )}

              {order.orderStatus === 'accepted' && (
                <IosButton
                  size="small"
                  className="w-full mt-2"
                  onClick={() => void updateOrderStatus(order.id, 'in_preparation')}
                >
                  En Preparación
                </IosButton>
              )}

              {order.orderStatus === 'in_preparation' && (
                <IosButton
                  size="small"
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={() => void updateOrderStatus(order.id, 'delivered')}
                >
                  Marcar Entregado
                </IosButton>
              )}
            </IosCard>
          ))}
        </div>
      )}
    </div>
  );
}
