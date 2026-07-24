import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';
import { IosModal } from '../../../components/ui/IosModal';
import type { ProviderAccount, Provider } from '../../../types';

export function AccountsPage(): React.JSX.Element {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    providerId: '',
    email: '',
    password: '',
    fullName: '',
    role: 'operator',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, providersRes] = await Promise.all([
          api.get<ProviderAccount[]>('/provider-accounts'),
          api.get<Provider[]>('/providers'),
        ]);
        setAccounts(accountsRes.data);
        setProviders(providersRes.data);
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/provider-accounts', newAccount);
      const response = await api.get<ProviderAccount[]>('/provider-accounts');
      setAccounts(response.data);
      setNewAccount({ providerId: '', email: '', password: '', fullName: '', role: 'operator' });
      setShowModal(false);
    } catch {
      // Error handled silently
    } finally {
      setCreating(false);
    }
  };

  const getProviderName = (providerId: string): string => {
    return providers.find((p) => p.id === providerId)?.name ?? 'Desconocido';
  };

  return (
    <div>
      <IosHeader
        title="Cuentas"
        subtitle={`${accounts.length} cuentas registradas`}
        rightAction={
          <IosButton size="small" onClick={() => setShowModal(true)}>
            + Nueva
          </IosButton>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[#8E8E93]">Cargando cuentas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <IosCard className="text-center py-8">
          <p className="text-[#8E8E93] text-[15px]">No hay cuentas registradas</p>
          <IosButton className="mt-4" onClick={() => setShowModal(true)}>
            Crear Primera Cuenta
          </IosButton>
        </IosCard>
      ) : (
        <div className="space-y-3 mt-4">
          {accounts.map((account) => (
            <IosCard key={account.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-semibold">{account.fullName}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        account.role === 'superuser'
                          ? 'bg-[#AF52DE]/10 text-[#AF52DE]'
                          : 'bg-[#007AFF]/10 text-[#007AFF]'
                      }`}
                    >
                      {account.role}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#8E8E93] mt-1">{account.email}</p>
                  <p className="text-[11px] text-[#AEAEB2] mt-1">
                    Proveedor: {getProviderName(account.providerId)}
                  </p>
                  {account.lastLogin && (
                    <p className="text-[11px] text-[#AEAEB2] mt-1">
                      Último login: {new Date(account.lastLogin).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    account.isActive
                      ? 'bg-[#34C759]/10 text-[#34C759]'
                      : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                  }`}
                >
                  {account.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </IosCard>
          ))}
        </div>
      )}

      <IosModal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Cuenta">
        <form onSubmit={(e) => void handleCreate(e)} className="p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Proveedor</label>
            <select
              value={newAccount.providerId}
              onChange={(e) =>
                setNewAccount((prev) => ({ ...prev, providerId: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              required
            >
              <option value="">Seleccionar proveedor</option>
              {providers
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={newAccount.fullName}
              onChange={(e) =>
                setNewAccount((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Email</label>
            <input
              type="email"
              value={newAccount.email}
              onChange={(e) =>
                setNewAccount((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Contraseña</label>
            <input
              type="password"
              value={newAccount.password}
              onChange={(e) =>
                setNewAccount((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Rol</label>
            <select
              value={newAccount.role}
              onChange={(e) =>
                setNewAccount((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <IosButton
              variant="secondary"
              className="flex-1"
              onClick={() => setShowModal(false)}
              type="button"
            >
              Cancelar
            </IosButton>
            <IosButton type="submit" className="flex-1" disabled={creating}>
              {creating ? 'Creando...' : 'Crear'}
            </IosButton>
          </div>
        </form>
      </IosModal>
    </div>
  );
}
