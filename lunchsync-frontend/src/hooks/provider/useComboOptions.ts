import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface ComboOptionItem {
  id: string;
  comboGroupId: string;
  optionName: string;
  extraPrice: number;
  initialStock: number | null;
  stockQuantity: number | null;
  isUnlimited: boolean;
  isAvailable: boolean;
}

export function useComboOptions(comboGroupId: string | null) {
  const [options, setOptions] = useState<ComboOptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOptions = useCallback(async () => {
    if (!comboGroupId) { setOptions([]); return; }
    try {
      setLoading(true);
      const response = await api.get<ComboOptionItem[]>(`/combo-options?comboGroupId=${comboGroupId}`);
      setOptions(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [comboGroupId]);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  const createOption = async (data: { optionName: string; extraPrice?: number; initialStock?: number; isUnlimited?: boolean }) => {
    const response = await api.post<ComboOptionItem>('/combo-options', { comboGroupId, ...data });
    setOptions((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateOption = async (id: string, data: Partial<ComboOptionItem>) => {
    const response = await api.patch<ComboOptionItem>(`/combo-options/${id}`, data);
    setOptions((prev) => prev.map((o) => (o.id === id ? response.data : o)));
    return response.data;
  };

  const deleteOption = async (id: string) => {
    await api.delete(`/combo-options/${id}`);
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  return { options, loading, createOption, updateOption, deleteOption, refetch: fetchOptions };
}
