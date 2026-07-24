import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Provider } from '../types';

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get<Provider[]>('/providers');
      setProviders(response.data);
    } catch (err) {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProviders();
  }, []);

  const createProvider = async (data: { name: string; phoneNumber: string }) => {
    const response = await api.post<Provider>('/providers', data);
    setProviders((prev) => [...prev, response.data]);
    return response.data;
  };

  const toggleProvider = async (id: string, isActive: boolean) => {
    await api.patch<Provider>(`/providers/${id}`, { isActive: !isActive });
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !isActive } : p)),
    );
  };

  return { providers, loading, error, createProvider, toggleProvider, refetch: fetchProviders };
}
