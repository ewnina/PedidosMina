import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface MenuServiceItem {
  id: string;
  dailyMenuId: string;
  name: string;
  description: string | null;
  basePrice: number;
  totalStock: number | null;
  remainingStock: number | null;
  isAvailable: boolean;
}

export function useMenuServices(dailyMenuId: string | null) {
  const [services, setServices] = useState<MenuServiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!dailyMenuId) { setServices([]); return; }
    try {
      setLoading(true);
      const response = await api.get<MenuServiceItem[]>(`/menu-services?dailyMenuId=${dailyMenuId}`);
      setServices(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [dailyMenuId]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const createService = async (data: { name: string; description?: string; basePrice: number; totalStock?: number }) => {
    const response = await api.post<MenuServiceItem>('/menu-services', { dailyMenuId, ...data });
    setServices((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateService = async (id: string, data: Partial<MenuServiceItem>) => {
    const response = await api.patch<MenuServiceItem>(`/menu-services/${id}`, data);
    setServices((prev) => prev.map((s) => (s.id === id ? response.data : s)));
    return response.data;
  };

  const deleteService = async (id: string) => {
    await api.delete(`/menu-services/${id}`);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  return { services, loading, createService, updateService, deleteService, refetch: fetchServices };
}
