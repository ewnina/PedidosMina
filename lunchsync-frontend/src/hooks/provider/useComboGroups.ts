import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface ComboGroupItem {
  id: string;
  menuServiceId: string;
  groupName: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
}

export function useComboGroups(menuServiceId: string | null) {
  const [groups, setGroups] = useState<ComboGroupItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!menuServiceId) { setGroups([]); return; }
    try {
      setLoading(true);
      const response = await api.get<ComboGroupItem[]>(`/combo-groups?menuServiceId=${menuServiceId}`);
      setGroups(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [menuServiceId]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (data: { groupName: string; isRequired?: boolean; minSelect?: number; maxSelect?: number }) => {
    const response = await api.post<ComboGroupItem>('/combo-groups', { menuServiceId, ...data });
    setGroups((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateGroup = async (id: string, data: Partial<ComboGroupItem>) => {
    const response = await api.patch<ComboGroupItem>(`/combo-groups/${id}`, data);
    setGroups((prev) => prev.map((g) => (g.id === id ? response.data : g)));
    return response.data;
  };

  const deleteGroup = async (id: string) => {
    await api.delete(`/combo-groups/${id}`);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  return { groups, loading, createGroup, updateGroup, deleteGroup, refetch: fetchGroups };
}
