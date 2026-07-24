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
          <p className="text-[#8E8E93]">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <IosCard>
              <p className="text-[13px] text-[#8E8E93]">Proveedores</p>
              <p className="text-[34px] font-bold text-[#007AFF]">{stats.totalProviders}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[#8E8E93]">Activos</p>
              <p className="text-[34px] font-bold text-[#34C759]">{stats.activeProviders}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[#8E8E93]">Cuentas</p>
              <p className="text-[34px] font-bold text-[#FF9500]">{stats.totalAccounts}</p>
            </IosCard>

            <IosCard>
              <p className="text-[13px] text-[#8E8E93]">Inactivos</p>
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
                className="flex items-center justify-between p-3 bg-[#F2F2F7] rounded-lg active:bg-[#E5E5EA] transition-colors"
              >
                <span className="text-[15px]">Gestionar Proveedores</span>
                <span className="text-[#8E8E93]">→</span>
              </a>
              <a
                href="/admin/accounts"
                className="flex items-center justify-between p-3 bg-[#F2F2F7] rounded-lg active:bg-[#E5E5EA] transition-colors"
              >
                <span className="text-[15px]">Gestionar Cuentas</span>
                <span className="text-[#8E8E93]">→</span>
              </a>
            </div>
          </IosCard>
        </div>
      )}
    </div>
  );
}
