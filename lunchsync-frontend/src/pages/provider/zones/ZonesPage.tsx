import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';
import { IosModal } from '../../../components/ui/IosModal';

interface DeliveryZone {
  id: string;
  providerId: string;
  zoneName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export function ZonesPage(): React.JSX.Element {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newZone, setNewZone] = useState({ zoneName: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<DeliveryZone[]>('/delivery-zones');
      setZones(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchZones();
  }, [fetchZones]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/delivery-zones', newZone);
      setNewZone({ zoneName: '', description: '' });
      setShowModal(false);
      void fetchZones();
    } catch {
      // Error handled silently
    } finally {
      setCreating(false);
    }
  };

  const toggleZone = async (id: string, isActive: boolean) => {
    await api.patch(`/delivery-zones/${id}`, { isActive: !isActive });
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, isActive: !isActive } : z)),
    );
  };

  return (
    <div>
      <IosHeader
        title="Zonas de Entrega"
        subtitle={`${zones.length} zonas`}
        rightAction={
          <IosButton size="small" onClick={() => setShowModal(true)}>
            + Nueva
          </IosButton>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[var(--c-text-secondary)]">Cargando zonas...</p>
        </div>
      ) : zones.length === 0 ? (
        <IosCard className="text-center py-8">
          <p className="text-[var(--c-text-secondary)] text-[15px]">No hay zonas creadas</p>
          <IosButton className="mt-4" onClick={() => setShowModal(true)}>
            Crear Primera Zona
          </IosButton>
        </IosCard>
      ) : (
        <div className="space-y-3 mt-4">
          {zones.map((zone) => (
            <IosCard key={zone.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-semibold">{zone.zoneName}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      zone.isActive
                        ? 'bg-[#34C759]/10 text-[#34C759]'
                        : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                    }`}>
                      {zone.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {zone.description && (
                    <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">{zone.description}</p>
                  )}
                </div>
                <button
                  onClick={() => void toggleZone(zone.id, zone.isActive)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    zone.isActive
                      ? 'bg-[#FF3B30]/10 text-[#FF3B30] active:bg-[#FF3B30]/20'
                      : 'bg-[#34C759]/10 text-[#34C759] active:bg-[#34C759]/20'
                  }`}
                >
                  {zone.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </IosCard>
          ))}
        </div>
      )}

      <IosModal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Zona">
        <form onSubmit={(e) => void handleCreate(e)} className="p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Nombre de la Zona</label>
            <input
              type="text"
              value={newZone.zoneName}
              onChange={(e) => setNewZone((prev) => ({ ...prev, zoneName: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]"
              placeholder="Ej: Zona Norte"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={newZone.description}
              onChange={(e) => setNewZone((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]"
              placeholder="Ej: Area de cobertura norte"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <IosButton variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">
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
