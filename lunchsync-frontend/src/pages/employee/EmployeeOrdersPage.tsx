import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { IosCard } from '../../components/ui/IosCard';
import { IosButton } from '../../components/ui/IosButton';
import { IosHeader } from '../../components/ui/IosHeader';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number | string;
  orderStatus: string;
  paymentStatus: string;
  specialInstructions: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  orderId: string;
  paymentMethod: string;
  status: string;
  proofImageUrl: string | null;
  employeeNote: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
  accepted: { label: 'Aceptado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  delivered: { label: 'Entregado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  cancelled: { label: 'Cancelado', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10' },
};

const paymentConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: 'Pagado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  unpaid: { label: 'Pendiente', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Comprobante enviado', color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
  confirmed: { label: 'Pago confirmado', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  rejected: { label: 'Comprobante rechazado', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10' },
};

export function EmployeeOrdersPage(): React.JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOrderId, setUploadModalOrderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = async () => {
    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        api.get<Order[]>('/employee/orders'),
        api.get<Payment[]>('/payments/my'),
      ]);
      setOrders(ordersRes.data);
      setPayments(paymentsRes.data);
      setError(null);
    } catch {
      setError('No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => void fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadProof = async (orderId: string, file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('paymentMethod', 'transfer');
      formData.append('proofImage', file);
      if (note.trim()) {
        formData.append('employeeNote', note.trim());
      }
      await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadModalOrderId(null);
      setNote('');
      void fetchOrders();
    } catch {
      setError('No se pudo subir el comprobante.');
    } finally {
      setUploading(false);
    }
  };

  const getPaymentForOrder = (orderId: string) => payments.find((p) => p.orderId === orderId);

  if (loading) {
    return <p className="text-[var(--c-text-secondary)] text-center py-8">Cargando pedidos...</p>;
  }

  return (
    <div>
      <IosHeader title="Mis Pedidos" />

      {error && (
        <p className="text-[13px] text-red-500 text-center py-4">{error}</p>
      )}

      <div className="space-y-3 mt-4">
        {orders.map((order) => {
          const status = (statusConfig[order.orderStatus] ?? statusConfig.pending) as { label: string; color: string; bg: string };
          const payStatus = paymentConfig[order.paymentStatus] ?? paymentConfig.unpaid!;
          const existingPayment = getPaymentForOrder(order.id);
          const payUploadStatus = existingPayment ? paymentStatusConfig[existingPayment.status] : null;

          return (
            <IosCard key={order.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[15px] font-semibold text-[var(--c-text)]">{order.orderNumber}</p>
                  <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                    {status.label}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${payStatus.color} ${payStatus.bg}`}>
                    {payStatus.label}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--c-separator)]">
                <p className="text-[13px] font-medium text-[var(--c-accent)]">
                  ${Number(order.totalAmount).toFixed(2)}
                </p>
                {order.paymentStatus === 'unpaid' && order.orderStatus !== 'cancelled' && !existingPayment && (
                  <IosButton
                    size="small"
                    variant="secondary"
                    onClick={() => { setUploadModalOrderId(order.id); setNote(''); }}
                  >
                    📎 Subir comprobante
                  </IosButton>
                )}
              </div>

              {existingPayment && (
                <div className="mt-2">
                  <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${payUploadStatus?.color ?? ''} ${payUploadStatus?.bg ?? ''}`}>
                    {payUploadStatus?.label ?? existingPayment.status}
                  </span>
                  {existingPayment.employeeNote && (
                    <p className="text-[12px] text-[var(--c-text-secondary)] mt-1 italic">
                      Nota: {existingPayment.employeeNote}
                    </p>
                  )}
                </div>
              )}

              {order.specialInstructions && (
                <p className="text-[12px] text-[var(--c-text-secondary)] mt-2 italic">
                  &quot;{order.specialInstructions}&quot;
                </p>
              )}
            </IosCard>
          );
        })}

        {orders.length === 0 && !error && (
          <p className="text-[var(--c-text-secondary)] text-center py-8">
            No tienes pedidos aun.
          </p>
        )}
      </div>

      {uploadModalOrderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setUploadModalOrderId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold mb-1">Subir comprobante</h3>
            <p className="text-[13px] text-[var(--c-text-secondary)] mb-4">Envía una foto del comprobante de transferencia</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadProof(uploadModalOrderId, file);
              }}
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota opcional (ej: nombre en transferencia, monto, etc.)"
              className="w-full mb-3 p-2 rounded-lg bg-[var(--c-bg-input)] text-[var(--c-text)] text-[13px] border border-[var(--c-separator)] resize-none"
              rows={2}
            />

            <IosButton
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : '📷 Seleccionar imagen'}
            </IosButton>

            <button
              className="w-full mt-3 p-2 text-[15px] text-[var(--c-text-secondary)]"
              onClick={() => setUploadModalOrderId(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
