import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { connectMenuSocket } from '../../lib/socket';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  providerId: string;
  dailyMenuId: string;
  deliveryZoneId: string;
  employeeName: string;
  employeePhone: string;
  providerName: string;
  deliveryZoneName: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  specialInstructions: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export function useOrders(dailyMenuId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = dailyMenuId ? `?dailyMenuId=${dailyMenuId}` : '';
      const response = await api.get<Order[]>(`/orders${params}`);
      setOrders(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [dailyMenuId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (dailyMenuId) {
      const s = connectMenuSocket(dailyMenuId);
      s.on('order-created', () => {
        void fetchOrders();
      });
      return () => {
        s.disconnect();
      };
    }
    return undefined;
  }, [dailyMenuId, fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o)),
    );
  };

  return { orders, loading, updateOrderStatus, refetch: fetchOrders };
}
