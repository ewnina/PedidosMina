import React, { useState } from 'react';
import { useMenus, type DailyMenu } from '../../../hooks/provider/useMenus';
import { useMenuServices, type MenuServiceItem } from '../../../hooks/provider/useMenuServices';
import { useComboGroups, type ComboGroupItem } from '../../../hooks/provider/useComboGroups';
import { useComboOptions, type ComboOptionItem } from '../../../hooks/provider/useComboOptions';
import { api } from '../../../lib/api';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';
import { IosModal } from '../../../components/ui/IosModal';

type ViewLevel = 'menus' | 'services' | 'groups' | 'options' | 'wizard';

interface WizardData {
  servingDate: string;
  orderCutoffTime: string;
  serviceName: string;
  basePrice: number;
  groups: WizardGroup[];
}

interface WizardGroup {
  groupName: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: WizardOption[];
}

interface WizardOption {
  optionName: string;
  extraPrice: number;
  isUnlimited: boolean;
  initialStock: number | null;
}

const defaultWizardData: WizardData = {
  servingDate: new Date().toISOString().split('T')[0]!,
  orderCutoffTime: '11:00',
  serviceName: 'Almuerzo Ejecutivo',
  basePrice: 300,
  groups: [
    {
      groupName: 'Guarniciones',
      isRequired: true,
      minSelect: 3,
      maxSelect: 3,
      options: [
        { optionName: 'Arroz', extraPrice: 0, isUnlimited: true, initialStock: null },
        { optionName: 'Habichuela', extraPrice: 0, isUnlimited: true, initialStock: null },
        { optionName: 'Moro Negro', extraPrice: 0, isUnlimited: true, initialStock: null },
      ],
    },
    {
      groupName: 'Proteína',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { optionName: 'Pollo Frito', extraPrice: 0, isUnlimited: true, initialStock: null },
        { optionName: 'Chuleta Frita', extraPrice: 0, isUnlimited: true, initialStock: null },
        { optionName: 'Huevo Frito', extraPrice: 0, isUnlimited: true, initialStock: null },
        { optionName: 'Pechuga a la Plancha', extraPrice: 0, isUnlimited: true, initialStock: null },
      ],
    },
    {
      groupName: 'Extras',
      isRequired: false,
      minSelect: 0,
      maxSelect: 3,
      options: [
        { optionName: 'Refresco Rojo', extraPrice: 50, isUnlimited: true, initialStock: null },
        { optionName: 'Refresco Natural', extraPrice: 50, isUnlimited: true, initialStock: null },
        { optionName: 'Postre del Día', extraPrice: 30, isUnlimited: true, initialStock: null },
      ],
    },
  ],
};

export function MenusPage(): React.JSX.Element {
  const { menus, loading, createMenu, publishMenu, deactivateMenu, activateMenu, deleteMenu } = useMenus();
  const [view, setView] = useState<ViewLevel>('menus');
  const [selectedMenu, setSelectedMenu] = useState<DailyMenu | null>(null);
  const [selectedService, setSelectedService] = useState<MenuServiceItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ComboGroupItem | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'menu' | 'service' | 'group' | 'option'>('menu');
  const [editingItem, setEditingItem] = useState<MenuServiceItem | ComboGroupItem | ComboOptionItem | null>(null);

  const [newMenu, setNewMenu] = useState({ servingDate: '', orderCutoffTime: '' });
  const [newService, setNewService] = useState({ name: '', description: '', basePrice: 0, totalStock: '' });
  const [newGroup, setNewGroup] = useState({ groupName: '', isRequired: true, minSelect: 1, maxSelect: 1 });
  const [newOption, setNewOption] = useState({ optionName: '', extraPrice: 0, initialStock: '', isUnlimited: true });

  const [wizardData, setWizardData] = useState<WizardData>({ ...defaultWizardData });
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardCreating, setWizardCreating] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const { services, loading: servicesLoading, createService, updateService, deleteService } = useMenuServices(selectedMenu?.id ?? null);
  const { groups, loading: groupsLoading, createGroup, updateGroup, deleteGroup } = useComboGroups(selectedService?.id ?? null);
  const { options, loading: optionsLoading, createOption, updateOption, deleteOption } = useComboOptions(selectedGroup?.id ?? null);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const openCreate = (type: 'menu' | 'service' | 'group' | 'option') => {
    setEditingItem(null);
    setModalType(type);
    setNewMenu({ servingDate: '', orderCutoffTime: '' });
    setNewService({ name: '', description: '', basePrice: 0, totalStock: '' });
    setNewGroup({ groupName: '', isRequired: true, minSelect: 1, maxSelect: 1 });
    setNewOption({ optionName: '', extraPrice: 0, initialStock: '', isUnlimited: true });
    setShowModal(true);
  };

  const openEdit = (type: 'service' | 'group' | 'option', item: MenuServiceItem | ComboGroupItem | ComboOptionItem) => {
    setEditingItem(item);
    setModalType(type);
    if (type === 'service') {
      const s = item as MenuServiceItem;
      setNewService({ name: s.name, description: s.description ?? '', basePrice: s.basePrice, totalStock: s.totalStock?.toString() ?? '' });
    } else if (type === 'group') {
      const g = item as ComboGroupItem;
      setNewGroup({ groupName: g.groupName, isRequired: g.isRequired, minSelect: g.minSelect, maxSelect: g.maxSelect });
    } else {
      const o = item as ComboOptionItem;
      setNewOption({ optionName: o.optionName, extraPrice: o.extraPrice, initialStock: o.initialStock?.toString() ?? '', isUnlimited: o.isUnlimited });
    }
    setShowModal(true);
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMenu(newMenu);
    setNewMenu({ servingDate: '', orderCutoffTime: '' });
    setShowModal(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const stock = newService.totalStock ? parseInt(newService.totalStock) : null;
    if (editingItem) {
      await updateService(editingItem.id, {
        name: newService.name,
        description: newService.description || null,
        basePrice: newService.basePrice,
        totalStock: stock,
      });
    } else {
      const payload: { name: string; basePrice: number; description?: string; totalStock?: number } = {
        name: newService.name,
        basePrice: newService.basePrice,
      };
      if (newService.description) payload.description = newService.description;
      if (stock != null) payload.totalStock = stock;
      await createService(payload);
    }
    setShowModal(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateGroup(editingItem.id, newGroup);
    } else {
      await createGroup(newGroup);
    }
    setShowModal(false);
  };

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const stock = newOption.initialStock ? parseInt(newOption.initialStock) : null;
    if (editingItem) {
      await updateOption(editingItem.id, {
        optionName: newOption.optionName,
        extraPrice: newOption.extraPrice,
        initialStock: stock,
        isUnlimited: newOption.isUnlimited,
      });
    } else {
      const payload: { optionName: string; extraPrice: number; isUnlimited: boolean; initialStock?: number } = {
        optionName: newOption.optionName,
        extraPrice: newOption.extraPrice,
        isUnlimited: newOption.isUnlimited,
      };
      if (stock != null) payload.initialStock = stock;
      await createOption(payload);
    }
    setShowModal(false);
  };

  const handleDelete = async (type: 'service' | 'group' | 'option', id: string) => {
    if (!confirm('Eliminar este elemento?')) return;
    if (type === 'service') await deleteService(id);
    else if (type === 'group') await deleteGroup(id);
    else await deleteOption(id);
  };

  const toggleAvailable = async (type: 'service' | 'option', id: string, current: boolean) => {
    if (type === 'service') await updateService(id, { isAvailable: !current });
    else await updateOption(id, { isAvailable: !current });
  };

  const selectMenu = (menu: DailyMenu) => {
    setSelectedMenu(menu);
    setView('services');
  };

  const selectService = (service: MenuServiceItem) => {
    setSelectedService(service);
    setView('groups');
  };

  const selectGroup = (group: ComboGroupItem) => {
    setSelectedGroup(group);
    setView('options');
  };

  const goBack = () => {
    if (view === 'options') { setView('groups'); setSelectedGroup(null); }
    else if (view === 'groups') { setView('services'); setSelectedService(null); }
    else if (view === 'services') { setView('menus'); setSelectedMenu(null); }
    else if (view === 'wizard') { setView('menus'); }
  };

  const backLabel = view === 'options' ? selectedService?.name ?? 'Servicio' : view === 'groups' ? selectedMenu ? formatDate(selectedMenu.servingDate) : 'Menú' : 'Menús';

  const startWizard = () => {
    setWizardData({ ...defaultWizardData, servingDate: new Date().toISOString().split('T')[0]! });
    setWizardStep(0);
    setWizardError(null);
    setView('wizard');
  };

  const wizardNext = () => setWizardStep((s) => s + 1);
  const wizardPrev = () => setWizardStep((s) => Math.max(0, s - 1));

  const addWizardGroup = () => {
    setWizardData((d) => ({
      ...d,
      groups: [...d.groups, { groupName: '', isRequired: true, minSelect: 1, maxSelect: 1, options: [] }],
    }));
  };

  const removeWizardGroup = (idx: number) => {
    setWizardData((d) => ({
      ...d,
      groups: d.groups.filter((_, i) => i !== idx),
    }));
  };

  const updateWizardGroup = (idx: number, field: keyof WizardGroup, value: string | boolean | number) => {
    setWizardData((d) => ({
      ...d,
      groups: d.groups.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  };

  const addWizardOption = (groupIdx: number) => {
    setWizardData((d) => ({
      ...d,
      groups: d.groups.map((g, i) =>
        i === groupIdx
          ? { ...g, options: [...g.options, { optionName: '', extraPrice: 0, isUnlimited: true, initialStock: null }] }
          : g
      ),
    }));
  };

  const removeWizardOption = (groupIdx: number, optIdx: number) => {
    setWizardData((d) => ({
      ...d,
      groups: d.groups.map((g, i) =>
        i === groupIdx ? { ...g, options: g.options.filter((_, j) => j !== optIdx) } : g
      ),
    }));
  };

  const updateWizardOption = (groupIdx: number, optIdx: number, field: keyof WizardOption, value: string | boolean | number | null) => {
    setWizardData((d) => ({
      ...d,
      groups: d.groups.map((g, i) =>
        i === groupIdx
          ? { ...g, options: g.options.map((o, j) => (j === optIdx ? { ...o, [field]: value } : o)) }
          : g
      ),
    }));
  };

  const executeWizard = async () => {
    setWizardCreating(true);
    setWizardError(null);
    try {
      const cutoff = new Date(`${wizardData.servingDate}T${wizardData.orderCutoffTime}:00`);
      const menuRes = await api.post<DailyMenu>('/daily-menus', {
        servingDate: wizardData.servingDate,
        orderCutoffTime: cutoff.toISOString(),
      });
      const menuId = menuRes.data.id;

      const serviceRes = await api.post<MenuServiceItem>('/menu-services', {
        dailyMenuId: menuId,
        name: wizardData.serviceName,
        basePrice: wizardData.basePrice,
      });
      const serviceId = serviceRes.data.id;

      for (const group of wizardData.groups) {
        if (!group.groupName.trim() || group.options.length === 0) continue;
        const groupRes = await api.post<ComboGroupItem>('/combo-groups', {
          menuServiceId: serviceId,
          groupName: group.groupName,
          isRequired: group.isRequired,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
        });
        const groupId = groupRes.data.id;

        for (const opt of group.options) {
          if (!opt.optionName.trim()) continue;
          const payload: Record<string, unknown> = {
            comboGroupId: groupId,
            optionName: opt.optionName,
            extraPrice: opt.extraPrice,
            isUnlimited: opt.isUnlimited,
          };
          if (!opt.isUnlimited && opt.initialStock != null) {
            payload.initialStock = opt.initialStock;
          }
          await api.post('/combo-options', payload);
        }
      }

      setView('menus');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el menú';
      setWizardError(msg);
    } finally {
      setWizardCreating(false);
    }
  };

  return (
    <div>
      {view === 'menus' && (
        <IosHeader
          title="Menús Diarios"
          subtitle={`${menus.length} menús`}
          rightAction={
            <div className="flex gap-2">
              <IosButton size="small" onClick={startWizard}>Armar Menú</IosButton>
              <IosButton size="small" variant="secondary" onClick={() => openCreate('menu')}>+ Manual</IosButton>
            </div>
          }
        />
      )}

      {view !== 'menus' && view !== 'wizard' && (
        <IosHeader
          title={view === 'services' ? formatDate(selectedMenu!.servingDate) : view === 'groups' ? selectedService!.name : selectedGroup!.groupName}
          subtitle={view === 'options' ? `${options.length} opciones` : backLabel}
          leftAction={<IosButton size="small" variant="secondary" onClick={goBack}>← Volver</IosButton>}
          rightAction={
            <IosButton size="small" onClick={() => openCreate(view === 'services' ? 'service' : view === 'groups' ? 'group' : 'option')}>
              + Nuevo
            </IosButton>
          }
        />
      )}

      {view === 'wizard' && (
        <IosHeader
          title="Armar Menú del Día"
          subtitle={`Paso ${wizardStep + 1} de 4`}
          leftAction={<IosButton size="small" variant="secondary" onClick={goBack}>← Cancelar</IosButton>}
        />
      )}

      {view === 'menus' && (
        loading ? (
          <div className="flex justify-center py-8"><p className="text-[var(--c-text-secondary)]">Cargando menús...</p></div>
        ) : menus.length === 0 ? (
          <IosCard className="text-center py-8">
            <p className="text-[var(--c-text-secondary)] text-[15px]">No hay menús creados</p>
            <IosButton className="mt-4" onClick={startWizard}>Armar Primer Menú</IosButton>
          </IosCard>
        ) : (
          <div className="space-y-3 mt-4">
            {menus.map((menu) => (
              <IosCard key={menu.id} onClick={() => selectMenu(menu)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold">{formatDate(menu.servingDate)}</h3>
                    <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">
                      Corte: {new Date(menu.orderCutoffTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {!menu.isActive ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#FF3B30]/10 text-[#FF3B30]">Desactivado</span>
                      ) : menu.publishedAt ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#34C759]/10 text-[#34C759]">Publicado</span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#FF9500]/10 text-[#FF9500]">Borrador</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!menu.publishedAt && (
                      <IosButton size="small" onClick={(e) => { e.stopPropagation(); void publishMenu(menu.id); }}>Publicar</IosButton>
                    )}
                    {menu.publishedAt && menu.isActive && (
                      <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); void deactivateMenu(menu.id); }}>Desactivar</IosButton>
                    )}
                    {menu.publishedAt && !menu.isActive && (
                      <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); void activateMenu(menu.id); }}>Activar</IosButton>
                    )}
                    <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar este menú y todos sus servicios?')) void deleteMenu(menu.id); }}>Eliminar</IosButton>
                  </div>
                </div>
              </IosCard>
            ))}
          </div>
        )
      )}

      {view === 'wizard' && (
        <div className="space-y-4 mt-4">
          {wizardError && (
            <p className="text-[13px] text-[#FF3B30] text-center">{wizardError}</p>
          )}

          {wizardStep === 0 && (
            <>
              <IosCard>
                <p className="text-[15px] font-semibold mb-3">Fecha y Hora</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[13px] text-[var(--c-text-secondary)] mb-1">Fecha de Servicio</label>
                    <input type="date" value={wizardData.servingDate} onChange={(e) => setWizardData((d) => ({ ...d, servingDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[var(--c-text-secondary)] mb-1">Hora Límite de Pedidos</label>
                    <input type="time" value={wizardData.orderCutoffTime} onChange={(e) => setWizardData((d) => ({ ...d, orderCutoffTime: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
                  </div>
                </div>
              </IosCard>
              <IosButton className="w-full" onClick={wizardNext}>Siguiente →</IosButton>
            </>
          )}

          {wizardStep === 1 && (
            <>
              <IosCard>
                <p className="text-[15px] font-semibold mb-3">Servicio</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[13px] text-[var(--c-text-secondary)] mb-1">Nombre</label>
                    <input type="text" value={wizardData.serviceName} onChange={(e) => setWizardData((d) => ({ ...d, serviceName: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[var(--c-text-secondary)] mb-1">Precio Base ($)</label>
                    <input type="number" min="0" step="0.01" value={wizardData.basePrice} onChange={(e) => setWizardData((d) => ({ ...d, basePrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
                  </div>
                </div>
              </IosCard>
              <div className="flex gap-3">
                <IosButton variant="secondary" className="flex-1" onClick={wizardPrev}>← Atrás</IosButton>
                <IosButton className="flex-1" onClick={wizardNext}>Siguiente →</IosButton>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              {wizardData.groups.map((group, gIdx) => (
                <IosCard key={gIdx}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <input type="text" value={group.groupName} onChange={(e) => updateWizardGroup(gIdx, 'groupName', e.target.value)} className="text-[15px] font-semibold bg-transparent border-none outline-none w-full" placeholder="Nombre del grupo" />
                      <div className="flex gap-3 mt-1">
                        <label className="flex items-center gap-1 text-[12px] text-[var(--c-text-secondary)]">
                          <input type="checkbox" checked={group.isRequired} onChange={(e) => updateWizardGroup(gIdx, 'isRequired', e.target.checked)} className="w-3.5 h-3.5" />
                          Requerido
                        </label>
                        <span className="text-[12px] text-[var(--c-text-secondary)]">
                          Min: <input type="number" min="0" value={group.minSelect} onChange={(e) => updateWizardGroup(gIdx, 'minSelect', parseInt(e.target.value) || 0)} className="w-10 bg-transparent border-b border-[var(--c-separator)] text-center text-[12px]" />
                          Max: <input type="number" min="1" value={group.maxSelect} onChange={(e) => updateWizardGroup(gIdx, 'maxSelect', parseInt(e.target.value) || 1)} className="w-10 bg-transparent border-b border-[var(--c-separator)] text-center text-[12px]" />
                        </span>
                      </div>
                    </div>
                    {wizardData.groups.length > 1 && (
                      <button onClick={() => removeWizardGroup(gIdx)} className="text-[#FF3B30] text-[13px] ml-2">✕</button>
                    )}
                  </div>
                  <div className="space-y-2 mt-2">
                    {group.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="text" value={opt.optionName} onChange={(e) => updateWizardOption(gIdx, oIdx, 'optionName', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--c-bg-input)] text-[13px]" placeholder="Nombre" />
                        <input type="number" min="0" step="0.01" value={opt.extraPrice} onChange={(e) => updateWizardOption(gIdx, oIdx, 'extraPrice', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg bg-[var(--c-bg-input)] text-[13px] text-right" placeholder="$0" />
                        {group.options.length > 1 && (
                          <button onClick={() => removeWizardOption(gIdx, oIdx)} className="text-[#FF3B30] text-[13px]">✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addWizardOption(gIdx)} className="text-[13px] text-[var(--c-accent)] mt-1">+ Agregar opción</button>
                  </div>
                </IosCard>
              ))}
              <button onClick={addWizardGroup} className="w-full py-2 text-[13px] text-[var(--c-accent)] border border-dashed border-[var(--c-accent)] rounded-xl">+ Agregar Grupo</button>
              <div className="flex gap-3">
                <IosButton variant="secondary" className="flex-1" onClick={wizardPrev}>← Atrás</IosButton>
                <IosButton className="flex-1" onClick={wizardNext}>Siguiente →</IosButton>
              </div>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <IosCard>
                <p className="text-[15px] font-semibold mb-3">Resumen del Menú</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[var(--c-text-secondary)]">Fecha</span>
                    <span className="text-[13px] font-medium">{formatDate(wizardData.servingDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[var(--c-text-secondary)]">Hora límite</span>
                    <span className="text-[13px] font-medium">{wizardData.orderCutoffTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[var(--c-text-secondary)]">Servicio</span>
                    <span className="text-[13px] font-medium">{wizardData.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[var(--c-text-secondary)]">Precio base</span>
                    <span className="text-[13px] font-medium text-[var(--c-accent)]">${wizardData.basePrice.toFixed(2)}</span>
                  </div>
                  <hr className="border-[var(--c-separator)]" />
                  {wizardData.groups.map((g, i) => (
                    <div key={i}>
                      <div className="flex justify-between">
                        <span className="text-[13px] font-medium">{g.groupName || '(Sin nombre)'}</span>
                        <span className="text-[12px] text-[var(--c-text-secondary)]">
                          {g.isRequired ? 'Req' : 'Opc'} · {g.minSelect}-{g.maxSelect}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.options.map((o, j) => (
                          <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--c-bg-input)] text-[var(--c-text-secondary)]">
                            {o.optionName || '?'}{o.extraPrice > 0 ? ` +$${o.extraPrice}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </IosCard>
              <div className="flex gap-3">
                <IosButton variant="secondary" className="flex-1" onClick={wizardPrev}>← Atrás</IosButton>
                <IosButton className="flex-1" disabled={wizardCreating} onClick={() => void executeWizard()}>
                  {wizardCreating ? 'Creando...' : 'Crear Menú'}
                </IosButton>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'services' && (
        servicesLoading ? (
          <div className="flex justify-center py-8"><p className="text-[var(--c-text-secondary)]">Cargando servicios...</p></div>
        ) : services.length === 0 ? (
          <IosCard className="text-center py-8">
            <p className="text-[var(--c-text-secondary)] text-[15px]">No hay servicios en este menú</p>
            <IosButton className="mt-4" onClick={() => openCreate('service')}>Agregar Servicio</IosButton>
          </IosCard>
        ) : (
          <div className="space-y-3 mt-4">
            {services.map((service) => (
              <IosCard key={service.id} onClick={() => selectService(service)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold">{service.name}</h3>
                    {service.description && <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">{service.description}</p>}
                    <p className="text-[15px] font-medium text-[var(--c-accent)] mt-1">${Number(service.basePrice).toFixed(2)}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${service.isAvailable ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                        {service.isAvailable ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit('service', service); }}>Editar</IosButton>
                    <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); void toggleAvailable('service', service.id, service.isAvailable); }}>
                      {service.isAvailable ? 'Desactivar' : 'Activar'}
                    </IosButton>
                  </div>
                </div>
              </IosCard>
            ))}
          </div>
        )
      )}

      {view === 'groups' && (
        groupsLoading ? (
          <div className="flex justify-center py-8"><p className="text-[var(--c-text-secondary)]">Cargando grupos...</p></div>
        ) : groups.length === 0 ? (
          <IosCard className="text-center py-8">
            <p className="text-[var(--c-text-secondary)] text-[15px]">No hay grupos en este servicio</p>
            <IosButton className="mt-4" onClick={() => openCreate('group')}>Agregar Grupo</IosButton>
          </IosCard>
        ) : (
          <div className="space-y-3 mt-4">
            {groups.map((group) => (
              <IosCard key={group.id} onClick={() => selectGroup(group)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold">{group.groupName}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${group.isRequired ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[var(--c-bg-input)] text-[var(--c-text-secondary)]'}`}>
                        {group.isRequired ? 'Requerido' : 'Opcional'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--c-bg-input)] text-[var(--c-text-secondary)]">
                        Seleccionar {group.minSelect}-{group.maxSelect}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit('group', group); }}>Editar</IosButton>
                    <IosButton size="small" variant="secondary" onClick={(e) => { e.stopPropagation(); void handleDelete('group', group.id); }}>Eliminar</IosButton>
                  </div>
                </div>
              </IosCard>
            ))}
          </div>
        )
      )}

      {view === 'options' && (
        optionsLoading ? (
          <div className="flex justify-center py-8"><p className="text-[var(--c-text-secondary)]">Cargando opciones...</p></div>
        ) : options.length === 0 ? (
          <IosCard className="text-center py-8">
            <p className="text-[var(--c-text-secondary)] text-[15px]">No hay opciones en este grupo</p>
            <IosButton className="mt-4" onClick={() => openCreate('option')}>Agregar Opción</IosButton>
          </IosCard>
        ) : (
          <div className="space-y-3 mt-4">
            {options.map((option) => (
              <IosCard key={option.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold">{option.optionName}</h3>
                    <p className="text-[15px] font-medium text-[var(--c-accent)] mt-1">
                      {Number(option.extraPrice) > 0 ? `+$${Number(option.extraPrice).toFixed(2)}` : 'Sin costo extra'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${option.isAvailable ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                        {option.isAvailable ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <IosButton size="small" variant="secondary" onClick={() => openEdit('option', option)}>Editar</IosButton>
                    <IosButton size="small" variant="secondary" onClick={() => void toggleAvailable('option', option.id, option.isAvailable)}>
                      {option.isAvailable ? 'Desactivar' : 'Activar'}
                    </IosButton>
                    <IosButton size="small" variant="secondary" onClick={() => void handleDelete('option', option.id)}>Eliminar</IosButton>
                  </div>
                </div>
              </IosCard>
            ))}
          </div>
        )
      )}

      <IosModal isOpen={showModal} onClose={() => setShowModal(false)} title={
        editingItem ? `Editar ${modalType === 'service' ? 'Servicio' : modalType === 'group' ? 'Grupo' : 'Opción'}` :
        modalType === 'menu' ? 'Nuevo Menú Diario' : modalType === 'service' ? 'Nuevo Servicio' : modalType === 'group' ? 'Nuevo Grupo' : 'Nueva Opción'
      }>
        {modalType === 'menu' && (
          <form onSubmit={(e) => void handleCreateMenu(e)} className="p-4 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Fecha de Servicio</label>
              <input type="date" value={newMenu.servingDate} onChange={(e) => setNewMenu((p) => ({ ...p, servingDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Hora Límite de Pedidos</label>
              <input type="time" value={newMenu.orderCutoffTime} onChange={(e) => setNewMenu((p) => ({ ...p, orderCutoffTime: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div className="flex gap-3 pt-2">
              <IosButton variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancelar</IosButton>
              <IosButton type="submit" className="flex-1">Crear</IosButton>
            </div>
          </form>
        )}

        {modalType === 'service' && (
          <form onSubmit={(e) => void handleCreateService(e)} className="p-4 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Nombre</label>
              <input type="text" value={newService.name} onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Descripción</label>
              <input type="text" value={newService.description} onChange={(e) => setNewService((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Precio Base ($)</label>
              <input type="number" step="0.01" min="0" value={newService.basePrice} onChange={(e) => setNewService((p) => ({ ...p, basePrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div className="flex gap-3 pt-2">
              <IosButton variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancelar</IosButton>
              <IosButton type="submit" className="flex-1">{editingItem ? 'Guardar' : 'Crear'}</IosButton>
            </div>
          </form>
        )}

        {modalType === 'group' && (
          <form onSubmit={(e) => void handleCreateGroup(e)} className="p-4 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Nombre del Grupo</label>
              <input type="text" value={newGroup.groupName} onChange={(e) => setNewGroup((p) => ({ ...p, groupName: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isRequired" checked={newGroup.isRequired} onChange={(e) => setNewGroup((p) => ({ ...p, isRequired: e.target.checked }))} className="w-5 h-5 rounded accent-[#007AFF]" />
              <label htmlFor="isRequired" className="text-[15px]">Requerido</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Mín. selección</label>
                <input type="number" min="1" value={newGroup.minSelect} onChange={(e) => setNewGroup((p) => ({ ...p, minSelect: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Máx. selección</label>
                <input type="number" min="1" value={newGroup.maxSelect} onChange={(e) => setNewGroup((p) => ({ ...p, maxSelect: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <IosButton variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancelar</IosButton>
              <IosButton type="submit" className="flex-1">{editingItem ? 'Guardar' : 'Crear'}</IosButton>
            </div>
          </form>
        )}

        {modalType === 'option' && (
          <form onSubmit={(e) => void handleCreateOption(e)} className="p-4 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Nombre de la Opción</label>
              <input type="text" value={newOption.optionName} onChange={(e) => setNewOption((p) => ({ ...p, optionName: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Precio Extra ($)</label>
              <input type="number" step="0.01" min="0" value={newOption.extraPrice} onChange={(e) => setNewOption((p) => ({ ...p, extraPrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isUnlimited" checked={newOption.isUnlimited} onChange={(e) => setNewOption((p) => ({ ...p, isUnlimited: e.target.checked }))} className="w-5 h-5 rounded accent-[#007AFF]" />
              <label htmlFor="isUnlimited" className="text-[15px]">Stock ilimitado</label>
            </div>
            {!newOption.isUnlimited && (
              <div>
                <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1">Stock Inicial</label>
                <input type="number" min="0" value={newOption.initialStock} onChange={(e) => setNewOption((p) => ({ ...p, initialStock: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--c-bg-input)] text-[15px]" required />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <IosButton variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancelar</IosButton>
              <IosButton type="submit" className="flex-1">{editingItem ? 'Guardar' : 'Crear'}</IosButton>
            </div>
          </form>
        )}
      </IosModal>
    </div>
  );
}
