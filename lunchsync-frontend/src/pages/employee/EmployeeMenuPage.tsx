import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { IosCard } from '../../components/ui/IosCard';
import { IosButton } from '../../components/ui/IosButton';
import { IosHeader } from '../../components/ui/IosHeader';

interface ComboOption {
  id: string;
  optionName: string;
  extraPrice: number | string;
  isAvailable: boolean;
  stockQuantity: number | null;
  isUnlimited: boolean;
}

interface ComboGroup {
  id: string;
  groupName: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  comboOptions: ComboOption[];
}

interface MenuService {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | string;
  totalStock: number | null;
  remainingStock: number | null;
  isAvailable: boolean;
  comboGroups: ComboGroup[];
}

interface TodayMenu {
  id: string;
  servingDate: string;
  orderCutoffTime: string;
  services: MenuService[];
}

interface DeliveryZone {
  id: string;
  zoneName: string;
  description: string | null;
}

export function EmployeeMenuPage(): React.JSX.Element {
  const [menu, setMenu] = useState<TodayMenu | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, zonesRes] = await Promise.all([
          api.get<TodayMenu>('/employee/today-menu'),
          api.get<DeliveryZone[]>('/employee/delivery-zones'),
        ]);
        setMenu(menuRes.data);
        setZones(zonesRes.data);
      } catch {
        setError('No hay menú disponible hoy.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const selectedService = menu?.services.find((s) => s.id === selectedServiceId) ?? null;

  const handleGroupSelection = (groupId: string, optionId: string, maxSelect: number) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (current.length < maxSelect) {
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return prev;
    });
  };

  const totalPrice = (() => {
    if (!selectedService) return 0;
    let total = Number(selectedService.basePrice);
    for (const group of selectedService.comboGroups) {
      const selected = selections[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.comboOptions.find((o) => o.id === optId);
        if (opt) total += Number(opt.extraPrice);
      }
    }
    return total;
  })();

  const allGroupsValid = selectedService?.comboGroups.every((group) => {
    const selected = selections[group.id] ?? [];
    return selected.length >= group.minSelect;
  }) ?? false;

  const handleSubmit = async () => {
    if (!selectedService || !selectedZoneId || !allGroupsValid) return;
    setSubmitting(true);
    setError(null);

    const allOptionIds = Object.values(selections).flat();

    try {
      await api.post('/employee/orders', {
        dailyMenuId: menu!.id,
        deliveryZoneId: selectedZoneId,
        menuServiceId: selectedService.id,
        selectedOptionIds: allOptionIds,
        totalAmount: totalPrice,
        specialInstructions: specialInstructions || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-[var(--c-text-secondary)] text-center py-8">Cargando menu...</p>;
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <p className="text-[48px] mb-4">✅</p>
        <p className="text-[17px] font-semibold text-[var(--c-text)]">Pedido enviado</p>
        <p className="text-[13px] text-[var(--c-text-secondary)] mt-2">
          Tu pedido fue registrado exitosamente.
        </p>
        <IosButton className="mt-6" onClick={() => {
          setSuccess(false);
          setSelectedServiceId(null);
          setSelections({});
          setSelectedZoneId(null);
          setSpecialInstructions('');
        }}>
          Hacer otro pedido
        </IosButton>
      </div>
    );
  }

  if (error && !menu) {
    return <p className="text-[#FF3B30] text-center py-8">{error}</p>;
  }

  return (
    <div>
      <IosHeader title="Menu del Dia" subtitle={menu ? `Fecha: ${menu.servingDate}` : ''} />

      {!selectedService ? (
        <div className="space-y-3 mt-4">
          {menu?.services.map((service) => (
            <IosCard key={service.id} onClick={() => {
              setSelectedServiceId(service.id);
              setSelections({});
            }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[17px] font-semibold text-[var(--c-text)]">{service.name}</p>
                  {service.description && (
                    <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">{service.description}</p>
                  )}
                </div>
                <p className="text-[15px] font-medium text-[var(--c-accent)]">
                  ${Number(service.basePrice).toFixed(2)}
                </p>
              </div>
              {service.remainingStock !== null && service.totalStock !== null && (
                <p className="text-[11px] text-[var(--c-text-secondary)] mt-2">
                  Stock: {service.remainingStock}/{service.totalStock}
                </p>
              )}
            </IosCard>
          ))}
          {menu?.services.length === 0 && (
            <p className="text-[var(--c-text-secondary)] text-center py-8">
              No hay servicios disponibles hoy.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <button
            onClick={() => setSelectedServiceId(null)}
            className="text-[15px] text-[var(--c-accent)] mb-2"
          >
            ← Volver a servicios
          </button>

          <IosCard>
            <p className="text-[17px] font-semibold text-[var(--c-text)]">{selectedService.name}</p>
            <p className="text-[15px] text-[var(--c-accent)] mt-1">
              Base: ${Number(selectedService.basePrice).toFixed(2)}
            </p>
          </IosCard>

          {selectedService.comboGroups.map((group) => (
            <IosCard key={group.id}>
              <p className="text-[15px] font-semibold text-[var(--c-text)] mb-2">
                {group.groupName}
                {group.isRequired && <span className="text-[#FF3B30] ml-1">*</span>}
              </p>
              <p className="text-[11px] text-[var(--c-text-secondary)] mb-3">
                Selecciona {group.minSelect === group.maxSelect ? group.minSelect : `${group.minSelect}-${group.maxSelect}`}
              </p>
              <div className="space-y-2">
                {group.comboOptions.map((opt) => {
                  const isSelected = (selections[group.id] ?? []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      disabled={!opt.isAvailable}
                      onClick={() => handleGroupSelection(group.id, opt.id, group.maxSelect)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        !opt.isAvailable
                          ? 'opacity-40 cursor-not-allowed border-[var(--c-separator)] bg-[var(--c-bg-input)]'
                          : isSelected
                            ? 'border-[var(--c-accent)] bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-bg-card))]'
                            : 'border-[var(--c-separator)] bg-[var(--c-bg-card)] active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[15px] text-[var(--c-text)]">{opt.optionName}</span>
                        <div className="flex items-center gap-2">
                          {Number(opt.extraPrice) > 0 && (
                            <span className="text-[13px] text-[var(--c-accent)]">+${Number(opt.extraPrice).toFixed(2)}</span>
                          )}
                          {isSelected && <span className="text-[var(--c-accent)]">✓</span>}
                        </div>
                      </div>
                      {!opt.isUnlimited && opt.stockQuantity !== null && (
                        <p className="text-[11px] text-[var(--c-text-secondary)] mt-1">
                          Stock: {opt.stockQuantity}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </IosCard>
          ))}

          <IosCard>
            <p className="text-[15px] font-semibold text-[var(--c-text)] mb-2">Zona de entrega</p>
            <div className="space-y-2">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedZoneId === zone.id
                      ? 'border-[var(--c-accent)] bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-bg-card))]'
                      : 'border-[var(--c-separator)] bg-[var(--c-bg-card)] active:scale-[0.98]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] text-[var(--c-text)]">{zone.zoneName}</span>
                    {selectedZoneId === zone.id && <span className="text-[var(--c-accent)]">✓</span>}
                  </div>
                </button>
              ))}
              {zones.length === 0 && (
                <p className="text-[13px] text-[var(--c-text-secondary)]">No hay zonas disponibles</p>
              )}
            </div>
          </IosCard>

          <IosCard>
            <p className="text-[15px] font-semibold text-[var(--c-text)] mb-2">Instrucciones especiales</p>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Opcional..."
              rows={2}
              className="w-full p-3 rounded-xl border border-[var(--c-separator)] bg-[var(--c-bg-input)] text-[15px] text-[var(--c-text)] resize-none"
            />
          </IosCard>

          <IosCard className="text-center">
            <p className="text-[13px] text-[var(--c-text-secondary)]">Total estimado</p>
            <p className="text-[24px] font-bold text-[var(--c-accent)] mt-1">
              ${totalPrice.toFixed(2)}
            </p>
          </IosCard>

          {error && (
            <p className="text-[13px] text-[#FF3B30] text-center">{error}</p>
          )}

          <IosButton
            className="w-full"
            size="large"
            disabled={!allGroupsValid || !selectedZoneId || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Confirmar Pedido'}
          </IosButton>
        </div>
      )}
    </div>
  );
}
