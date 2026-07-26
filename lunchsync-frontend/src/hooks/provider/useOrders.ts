import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { connectOrderSocket } from '../../lib/socket';

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
  totalAmount: number | string;
  orderStatus: string;
  paymentStatus: string;
  specialInstructions: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export function useOrders(providerId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Order[]>('/orders');
      setOrders(response.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!providerId) return undefined;

    const s = connectOrderSocket(providerId);
    s.on('order-new', () => {
      void fetchOrders();
    });
    return () => {
      s.disconnect();
    };
  }, [providerId, fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o)),
    );
  };

  return { orders, loading, updateOrderStatus, refetch: fetchOrders };
}
