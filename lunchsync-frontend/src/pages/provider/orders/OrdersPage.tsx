import React, { useState, useCallback, useEffect } from 'react';
import { useOrders, type Order } from '../../../hooks/provider/useOrders';
import { api } from '../../../lib/api';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';

const statusColors: Record<string, string> = {
  pending: 'bg-[#FF9500]/10 text-[#FF9500]',
  accepted: 'bg-[#34C759]/10 text-[#34C759]',
  delivered: 'bg-[#AF52DE]/10 text-[#AF52DE]',
  cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30]',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  paid: { label: 'Pagado', color: 'bg-[#34C759]/10 text-[#34C759]' },
  unpaid: { label: 'Pendiente pago', color: 'bg-[#FF9500]/10 text-[#FF9500]' },
};

interface Payment {
  id: string;
  orderId: string;
  amount: number | string;
  paymentMethod: string;
  status: string;
  proofImageUrl: string | null;
  rejectionReason: string | null;
  employeeNote: string | null;
  createdAt: string;
}

export function OrdersPage(): React.JSX.Element {
  const { orders, loading, updateOrderStatus, refetch } = useOrders();
  const [filter, setFilter] = useState('all');
  const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [proofModal, setProofModal] = useState<{ payment: Payment; orderId: string } | null>(null);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const { data } = await api.get<Payment[]>('/payments?status=pending');
      setPendingPayments(data);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    void fetchPendingPayments();
  }, [fetchPendingPayments]);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.orderStatus === filter);

  const handleCashPayment = async (order: Order) => {
    try {
      await api.post('/payments', {
        orderId: order.id,
        paymentMethod: 'cash',
      });
      setPayModalOrder(null);
      void refetch();
      void fetchPendingPayments();
    } catch { /* */ }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await api.patch(`/payments/${paymentId}/confirm`, { status: 'confirmed' });
      setProofModal(null);
      void refetch();
      void fetchPendingPayments();
    } catch { /* */ }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await api.patch(`/payments/${paymentId}/confirm`, { status: 'rejected', rejectionReason: 'No coincide el comprobante' });
      setProofModal(null);
      void fetchPendingPayments();
    } catch { /* */ }
  };

  const getPendingPayment = (orderId: string) => pendingPayments.find((p) => p.orderId === orderId);

  return (
    <div>
      <IosHeader title="Pedidos" subtitle={`${orders.length} pedidos totales`} />

      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
        {['all', 'pending', 'accepted', 'delivered'].map((f) => (
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
          {filteredOrders.map((order) => {
            const payInfo = paymentLabels[order.paymentStatus];
            const pendingPay = getPendingPayment(order.id);

            return (
              <IosCard key={order.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-semibold">#{order.orderNumber}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[order.orderStatus] ?? ''}`}>
                        {statusLabels[order.orderStatus] ?? order.orderStatus}
                      </span>
                      {payInfo && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${payInfo.color}`}>
                          {payInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">{order.employeeName} • {order.employeePhone}</p>
                    <p className="text-[13px] text-[var(--c-text-secondary)]">📍 {order.deliveryZoneName}</p>
                  </div>
                  <span className="text-[17px] font-bold text-[var(--c-accent)]">${Number(order.totalAmount).toFixed(2)}</span>
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
                    onClick={() => void updateOrderStatus(order.id, 'delivered')}
                  >
                    Marcar Entregado
                  </IosButton>
                )}

                {order.paymentStatus === 'unpaid' && order.orderStatus !== 'cancelled' && !pendingPay && (
                  <IosButton
                    size="small"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => setPayModalOrder(order)}
                  >
                    💰 Cobrar
                  </IosButton>
                )}

                {pendingPay && pendingPay.paymentMethod === 'transfer' && (
                  <IosButton
                    size="small"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => setProofModal({ payment: pendingPay, orderId: order.id })}
                  >
                    📎 Ver comprobante transferencia
                  </IosButton>
                )}
              </IosCard>
            );
          })}
        </div>
      )}

      {payModalOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPayModalOrder(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold mb-1">Cobrar pedido #{payModalOrder.orderNumber}</h3>
            <p className="text-[15px] text-[var(--c-text-secondary)] mb-4">${Number(payModalOrder.totalAmount).toFixed(2)}</p>

            <div className="space-y-2">
              <button
                className="w-full p-3 rounded-xl bg-[#34C759]/10 text-[#34C759] font-medium text-[15px] hover:bg-[#34C759]/20 transition-colors"
                onClick={() => void handleCashPayment(payModalOrder)}
              >
                💵 Efectivo
              </button>
              <p className="text-[13px] text-[var(--c-text-secondary)] text-center">
                La transferencia la registra el empleado
              </p>
            </div>

            <button
              className="w-full mt-3 p-2 text-[15px] text-[var(--c-text-secondary)]"
              onClick={() => setPayModalOrder(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {proofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setProofModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold mb-3">Comprobante de transferencia</h3>

            {proofModal.payment.proofImageUrl && (
              <img
                src={`${api.defaults.baseURL}${proofModal.payment.proofImageUrl}`}
                alt="Comprobante"
                className="w-full rounded-xl mb-4 max-h-64 object-contain bg-gray-100"
              />
            )}

            <p className="text-[15px] text-[var(--c-text-secondary)] mb-4">
              Monto: ${Number(proofModal.payment.amount).toFixed(2)}
            </p>

            {proofModal.payment.employeeNote && (
              <p className="text-[13px] text-[var(--c-text-secondary)] bg-[var(--c-bg-input)] p-2 rounded-lg mb-4 italic">
                📝 {proofModal.payment.employeeNote}
              </p>
            )}

            <div className="flex gap-2">
              <IosButton
                size="small"
                variant="destructive"
                className="flex-1"
                onClick={() => void handleRejectPayment(proofModal.payment.id)}
              >
                Rechazar
              </IosButton>
              <IosButton
                size="small"
                className="flex-1"
                onClick={() => void handleConfirmPayment(proofModal.payment.id)}
              >
                Confirmar
              </IosButton>
            </div>

            <button
              className="w-full mt-3 p-2 text-[15px] text-[var(--c-text-secondary)]"
              onClick={() => setProofModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
