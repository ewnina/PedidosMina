import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface DailyMenu {
  id: string;
  providerId: string;
  servingDate: string;
  publishedAt: string | null;
  orderCutoffTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface MenuService {
  id: string;
  dailyMenuId: string;
  name: string;
  description: string | null;
  basePrice: number;
  totalStock: number | null;
  remainingStock: number | null;
  isAvailable: boolean;
}

export function useMenus() {
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<DailyMenu[]>('/daily-menus');
      setMenus(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMenus();
  }, [fetchMenus]);

  const createMenu = async (data: { servingDate: string; orderCutoffTime: string }) => {
    const response = await api.post<DailyMenu>('/daily-menus', data);
    setMenus((prev) => [response.data, ...prev]);
    return response.data;
  };

  const publishMenu = async (id: string) => {
    await api.patch(`/daily-menus/${id}/publish`);
    setMenus((prev) =>
      prev.map((m) => (m.id === id ? { ...m, publishedAt: new Date().toISOString() } : m)),
    );
  };

  return { menus, loading, createMenu, publishMenu, refetch: fetchMenus };
}
