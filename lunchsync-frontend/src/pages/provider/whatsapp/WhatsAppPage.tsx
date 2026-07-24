import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { connectWhatsappSocket } from '../../../lib/socket';
import { IosCard } from '../../../components/ui/IosCard';
import { IosButton } from '../../../components/ui/IosButton';
import { IosHeader } from '../../../components/ui/IosHeader';
import { useAuth } from '../../../contexts/AuthContext';

interface BotStatus {
  providerId: string;
  status: string;
  lastConnectedAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  disconnected: { label: 'Desconectado', color: 'text-[#8E8E93]' },
  starting: { label: 'Iniciando...', color: 'text-[#FF9500]' },
  waiting_qr: { label: 'Esperando QR', color: 'text-[#FF9500]' },
  connected: { label: 'Conectado', color: 'text-[#34C759]' },
  reconnecting: { label: 'Reconectando...', color: 'text-[#FF9500]' },
  authentication_failed: { label: 'Error de Auth', color: 'text-[#FF3B30]' },
  stopped: { label: 'Detenido', color: 'text-[#8E8E93]' },
};

export function WhatsAppPage(): React.JSX.Element {
  const { user } = useAuth();
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.providerId) return;

    const fetchStatus = async () => {
      try {
        const response = await api.get<BotStatus>(`/providers/${user.providerId}/whatsapp/status`);
        setBotStatus(response.data);
      } catch {
        setBotStatus({ providerId: user.providerId, status: 'disconnected', lastConnectedAt: null });
      } finally {
        setLoading(false);
      }
    };

    void fetchStatus();

    const socket = connectWhatsappSocket(user.providerId);

    socket.on('whatsapp-status-changed', (data: { status: string }) => {
      setBotStatus((prev) => prev ? { ...prev, status: data.status } : null);
    });

    socket.on('whatsapp-qr-generated', (data: { qrCode: string | null }) => {
      setQrCode(data.qrCode);
    });

    socket.on('whatsapp-connected', () => {
      setQrCode(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.providerId]);

  const startBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/start`);
  };

  const stopBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/stop`);
  };

  const restartBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/restart`);
  };

  const unlinkBot = async () => {
    if (!user?.providerId) return;
    if (confirm('¿Estás seguro? Se eliminará la sesión de WhatsApp.')) {
      await api.post(`/providers/${user.providerId}/whatsapp/unlink`);
      setBotStatus((prev) => prev ? { ...prev, status: 'disconnected' } : null);
    }
  };

  const statusKey = botStatus?.status ?? 'disconnected';
  const config = (statusConfig[statusKey] ?? statusConfig.disconnected) as { label: string; color: string };

  return (
    <div>
      <IosHeader title="WhatsApp Bot" subtitle="Gestión del bot de pedidos" />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[#8E8E93]">Cargando estado...</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <IosCard>
            <div className="text-center">
              <p className="text-[13px] text-[#8E8E93]">Estado Actual</p>
              <p className={`text-[24px] font-bold mt-1 ${config.color}`}>{config.label}</p>
              {botStatus?.lastConnectedAt && (
                <p className="text-[11px] text-[#AEAEB2] mt-1">
                  Última conexión: {new Date(botStatus.lastConnectedAt).toLocaleString()}
                </p>
              )}
            </div>
          </IosCard>

          {qrCode && (
            <IosCard className="text-center">
              <p className="text-[13px] text-[#8E8E93] mb-3">Escanea el código QR</p>
              <img src={qrCode} alt="WhatsApp QR" className="mx-auto max-w-[250px] rounded-lg" />
            </IosCard>
          )}

          <IosCard>
            <h3 className="text-[17px] font-semibold mb-3">Controles</h3>
            <div className="space-y-2">
              <IosButton className="w-full" onClick={() => void startBot()}>
                ▶️ Iniciar Bot
              </IosButton>
              <IosButton variant="secondary" className="w-full" onClick={() => void stopBot()}>
                ⏹️ Detener Bot
              </IosButton>
              <IosButton variant="secondary" className="w-full" onClick={() => void restartBot()}>
                🔄 Reiniciar Bot
              </IosButton>
              <IosButton variant="destructive" className="w-full" onClick={() => void unlinkBot()}>
                🔗 Desvincular WhatsApp
              </IosButton>
            </div>
          </IosCard>
        </div>
      )}
    </div>
  );
}
