import React, { useState } from 'react';
import { useProviders } from '../../../hooks/useProviders';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';
import { IosModal } from '../../../components/ui/IosModal';

export function ProvidersPage(): React.JSX.Element {
  const { providers, loading, error, createProvider, toggleProvider } = useProviders();
  const [showModal, setShowModal] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', phoneNumber: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createProvider(newProvider);
      setNewProvider({ name: '', phoneNumber: '' });
      setShowModal(false);
    } catch {
      // Error handled silently
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <IosHeader
        title="Proveedores"
        subtitle={`${providers.length} registros`}
        rightAction={
          <IosButton size="small" onClick={() => setShowModal(true)}>
            + Nuevo
          </IosButton>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[#8E8E93]">Cargando proveedores...</p>
        </div>
      ) : error ? (
        <div className="bg-[#FF3B30]/10 p-4 rounded-lg">
          <p className="text-[#FF3B30] text-[15px]">{error}</p>
        </div>
      ) : providers.length === 0 ? (
        <IosCard className="text-center py-8">
          <p className="text-[#8E8E93] text-[15px]">No hay proveedores registrados</p>
          <IosButton className="mt-4" onClick={() => setShowModal(true)}>
            Crear Primer Proveedor
          </IosButton>
        </IosCard>
      ) : (
        <div className="space-y-3 mt-4">
          {providers.map((provider) => (
            <IosCard key={provider.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-semibold">{provider.name}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        provider.isActive
                          ? 'bg-[#34C759]/10 text-[#34C759]'
                          : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                      }`}
                    >
                      {provider.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#8E8E93] mt-1">{provider.phoneNumber}</p>
                  <p className="text-[11px] text-[#AEAEB2] mt-1">
                    ID: {provider.id.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={() => void toggleProvider(provider.id, provider.isActive)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    provider.isActive
                      ? 'bg-[#FF3B30]/10 text-[#FF3B30] active:bg-[#FF3B30]/20'
                      : 'bg-[#34C759]/10 text-[#34C759] active:bg-[#34C759]/20'
                  }`}
                >
                  {provider.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </IosCard>
          ))}
        </div>
      )}

      <IosModal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Proveedor">
        <form onSubmit={(e) => void handleCreate(e)} className="p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">
              Nombre del Proveedor
            </label>
            <input
              type="text"
              value={newProvider.name}
              onChange={(e) => setNewProvider((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="Ej: Cocina La Abuela"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={newProvider.phoneNumber}
              onChange={(e) =>
                setNewProvider((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="Ej: +584121234567"
              required
            />
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
            <IosButton
              type="submit"
              className="flex-1"
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear'}
            </IosButton>
          </div>
        </form>
      </IosModal>
    </div>
  );
}
