import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { IosCard } from '../../components/ui/IosCard';
import { IosHeader } from '../../components/ui/IosHeader';

interface Stats {
  todayOrders: number;
  pendingOrders: number;
  totalMenus: number;
}

export function ProviderDashboardPage(): React.JSX.Element {
  const [stats, setStats] = useState<Stats>({ todayOrders: 0, pendingOrders: 0, totalMenus: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ordersRes, menusRes] = await Promise.all([
          api.get('/orders'),
          api.get('/daily-menus'),
        ]);
        const orders = ordersRes.data as Array<{ orderStatus: string }>;
        const menus = menusRes.data as unknown[];
        setStats({
          todayOrders: orders.length,
          pendingOrders: orders.filter((o) => o.orderStatus === 'pending').length,
          totalMenus: menus.length,
        });
      } catch {
        // Stats will remain at 0
      } finally {
        setLoading(false);
      }
    };
    void fetchStats();
  }, []);

  return (
    <div>
      <IosHeader title="Mi Comedor" subtitle="Panel del proveedor" />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[var(--c-text-secondary)]">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <IosCard>
              <p className="text-[11px] text-[var(--c-text-secondary)] text-center">Pedidos Hoy</p>
              <p className="text-[28px] font-bold text-[var(--c-accent)] text-center">{stats.todayOrders}</p>
            </IosCard>
            <IosCard>
              <p className="text-[11px] text-[var(--c-text-secondary)] text-center">Pendientes</p>
              <p className="text-[28px] font-bold text-[#FF9500] text-center">{stats.pendingOrders}</p>
            </IosCard>
            <IosCard>
              <p className="text-[11px] text-[var(--c-text-secondary)] text-center">Menús</p>
              <p className="text-[28px] font-bold text-[#34C759] text-center">{stats.totalMenus}</p>
            </IosCard>
          </div>

          <IosCard>
            <h3 className="text-[17px] font-semibold mb-3">Acciones Rápidas</h3>
            <div className="space-y-2">
              <a href="/provider/menus" className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors">
                <span className="text-[15px]">📋 Gestionar Menús</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
              <a href="/provider/orders" className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors">
                <span className="text-[15px]">🛒 Ver Pedidos</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
              <a href="/provider/whatsapp" className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors">
                <span className="text-[15px]">💬 WhatsApp Bot</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
              <a href="/provider/zones" className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors">
                <span className="text-[15px]">📍 Zonas de Entrega</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
            </div>
          </IosCard>
        </div>
      )}
    </div>
  );
}
