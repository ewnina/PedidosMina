import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { IosCard } from '../../../components/ui/IosCard';
import { IosHeader } from '../../../components/ui/IosHeader';

interface SummaryRow {
  method: string;
  status: string;
  count: string;
  total: string;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number | string;
  paymentMethod: string;
  status: string;
  proofImageUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: { fullName: string };
  order?: { orderNumber: string };
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};

export function ConciliationPage(): React.JSX.Element {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [employeeName, setEmployeeName] = useState('');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get<SummaryRow[]>('/payments/summary', { params: { dateFrom, dateTo } }),
        api.get<Payment[]>('/payments', { params: { dateFrom, dateTo, employeeName: employeeName || undefined } }),
      ]);
      setSummary(summaryRes.data);
      setPayments(paymentsRes.data);
    } catch { /* */ }
  }, [dateFrom, dateTo, employeeName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totals = summary.reduce(
    (acc, row) => {
      const total = Number(row.total);
      const count = Number(row.count);
      acc.total += total;
      acc.count += count;
      if (row.status === 'confirmed') {
        acc.confirmed += total;
        acc.confirmedCount += count;
      }
      if (row.status === 'pending') {
        acc.pending += total;
        acc.pendingCount += count;
      }
      return acc;
    },
    { total: 0, count: 0, confirmed: 0, confirmedCount: 0, pending: 0, pendingCount: 0 },
  );

  return (
    <div>
      <IosHeader title="Conciliación" subtitle="Resumen de pagos" />

      <div className="flex gap-2 mt-4">
        <div className="flex-1">
          <label className="text-[12px] text-[var(--c-text-secondary)]">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full mt-1 p-2 rounded-lg bg-[var(--c-bg-input)] text-[var(--c-text)] text-[14px] border border-[var(--c-separator)]"
          />
        </div>
        <div className="flex-1">
          <label className="text-[12px] text-[var(--c-text-secondary)]">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full mt-1 p-2 rounded-lg bg-[var(--c-bg-input)] text-[var(--c-text)] text-[14px] border border-[var(--c-separator)]"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[12px] text-[var(--c-text-secondary)]">Buscar empleado</label>
        <input
          type="text"
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
          placeholder="Nombre del empleado..."
          className="w-full mt-1 p-2 rounded-lg bg-[var(--c-bg-input)] text-[var(--c-text)] text-[14px] border border-[var(--c-separator)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <IosCard>
          <p className="text-[12px] text-[var(--c-text-secondary)]">Total</p>
          <p className="text-[20px] font-bold text-[var(--c-text)]">${totals.total.toFixed(2)}</p>
          <p className="text-[12px] text-[var(--c-text-secondary)]">{totals.count} pagos</p>
        </IosCard>
        <IosCard>
          <p className="text-[12px] text-[var(--c-text-secondary)]">Confirmado</p>
          <p className="text-[20px] font-bold text-[#34C759]">${totals.confirmed.toFixed(2)}</p>
          <p className="text-[12px] text-[var(--c-text-secondary)]">{totals.confirmedCount} pagos</p>
        </IosCard>
        <IosCard>
          <p className="text-[12px] text-[var(--c-text-secondary)]">Pendiente</p>
          <p className="text-[20px] font-bold text-[#FF9500]">${totals.pending.toFixed(2)}</p>
          <p className="text-[12px] text-[var(--c-text-secondary)]">{totals.pendingCount} pagos</p>
        </IosCard>
        <IosCard>
          <p className="text-[12px] text-[var(--c-text-secondary)]">Por método</p>
          <div className="mt-1">
            {summary.filter((r) => r.status === 'confirmed').map((row) => (
              <p key={`${row.method}-${row.status}`} className="text-[13px] text-[var(--c-text)]">
                {methodLabels[row.method] ?? row.method}: ${Number(row.total).toFixed(2)}
              </p>
            ))}
          </div>
        </IosCard>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-[15px] font-semibold text-[var(--c-text)]">Detalle</h3>
        {payments.length === 0 ? (
          <IosCard className="text-center py-6">
            <p className="text-[var(--c-text-secondary)] text-[14px]">No hay pagos en este período</p>
          </IosCard>
        ) : (
          payments.map((p) => (
            <IosCard key={p.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[14px] font-medium text-[var(--c-text)]">
                    {p.user?.fullName ?? 'Empleado'} • {p.order?.orderNumber ?? ''}
                  </p>
                  <p className="text-[12px] text-[var(--c-text-secondary)]">
                    {methodLabels[p.paymentMethod] ?? p.paymentMethod} • {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  {p.rejectionReason && (
                    <p className="text-[12px] text-[#FF3B30] mt-1">{p.rejectionReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-[var(--c-accent)]">${Number(p.amount).toFixed(2)}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'confirmed' ? 'bg-[#34C759]/10 text-[#34C759]'
                    : p.status === 'rejected' ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                    : 'bg-[#FF9500]/10 text-[#FF9500]'
                  }`}>
                    {statusLabels[p.status] ?? p.status}
                  </span>
                </div>
              </div>
              {p.proofImageUrl && (
                <img
                  src={`${api.defaults.baseURL}${p.proofImageUrl}`}
                  alt="Comprobante"
                  className="mt-2 w-16 h-16 object-cover rounded-lg"
                />
              )}
            </IosCard>
          ))
        )}
      </div>
    </div>
  );
}
