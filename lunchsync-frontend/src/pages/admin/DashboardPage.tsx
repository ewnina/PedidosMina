import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { IosCard } from '../../components/ui/IosCard';
import { IosHeader } from '../../components/ui/IosHeader';

interface Stats {
  totalProviders: number;
  activeProviders: number;
  totalAccounts: number;
}

export function DashboardPage(): React.JSX.Element {
  const [stats, setStats] = useState<Stats>({ totalProviders: 0, activeProviders: 0, totalAccounts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [providersRes, accountsRes] = await Promise.all([
          api.get('/providers'),
          api.get('/provider-accounts'),
        ]);
        const providers = providersRes.data as Array<{ isActive: boolean }>;
        setStats({
          totalProviders: providers.length,
          activeProviders: providers.filter((p) => p.isActive).length,
          totalAccounts: (accountsRes.data as unknown[]).length,
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
      <IosHeader title="Dashboard" subtitle="Resumen del sistema" />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[var(--c-text-secondary)]">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <IosCard>
              <p className="text-[13px] text-[var(--c-text-secondary)]">Proveedores</p>
              <p className="text-[34px] font-bold text-[var(--c-accent)]">{stats.totalProviders}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[var(--c-text-secondary)]">Activos</p>
              <p className="text-[34px] font-bold text-[#34C759]">{stats.activeProviders}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[var(--c-text-secondary)]">Cuentas</p>
              <p className="text-[34px] font-bold text-[#FF9500]">{stats.totalAccounts}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[var(--c-text-secondary)]">Inactivos</p>
              <p className="text-[34px] font-bold text-[#FF3B30]">
                {stats.totalProviders - stats.activeProviders}
              </p>
            </IosCard>
          </div>

          <IosCard>
            <h3 className="text-[17px] font-semibold mb-2">Acciones Rápidas</h3>
            <div className="space-y-2">
              <a
                href="/admin/providers"
                className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors"
              >
                <span className="text-[15px]">Gestionar Proveedores</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
              <a
                href="/admin/accounts"
                className="flex items-center justify-between p-3 bg-[var(--c-bg-input)] rounded-lg active:bg-[var(--c-separator)] transition-colors"
              >
                <span className="text-[15px]">Gestionar Cuentas</span>
                <span className="text-[var(--c-text-secondary)]">→</span>
              </a>
            </div>
          </IosCard>
        </div>
      )}
    </div>
  );
}
