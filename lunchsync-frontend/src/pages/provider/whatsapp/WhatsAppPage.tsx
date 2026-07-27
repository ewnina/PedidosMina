import React, { useState, useEffect, useRef } from 'react';
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
  disconnected: { label: 'Desconectado', color: 'text-[var(--c-text-secondary)]' },
  starting: { label: 'Iniciando...', color: 'text-[#FF9500]' },
  waiting_qr: { label: 'Esperando QR', color: 'text-[#FF9500]' },
  connected: { label: 'Conectado', color: 'text-[#34C759]' },
  reconnecting: { label: 'Reconectando...', color: 'text-[#FF9500]' },
  authentication_failed: { label: 'Error de Auth', color: 'text-[#FF3B30]' },
  stopped: { label: 'Detenido', color: 'text-[var(--c-text-secondary)]' },
};

export function WhatsAppPage(): React.JSX.Element {
  const { user } = useAuth();
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user?.providerId]);

  useEffect(() => {
    if (!user?.providerId) return;

    if (pollRef.current) clearInterval(pollRef.current);

    if (botStatus?.status === 'waiting_qr' || botStatus?.status === 'starting') {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get<{ providerId: string; qrCode: string | null }>(
            `/providers/${user.providerId}/whatsapp/qr`,
          );
          if (data.qrCode) {
            setQrCode(data.qrCode);
          }
          if (botStatus?.status === 'waiting_qr' || botStatus?.status === 'starting') {
            const statusRes = await api.get<BotStatus>(`/providers/${user.providerId}/whatsapp/status`);
            setBotStatus(statusRes.data);
          }
        } catch {
          // ignore polling errors
        }
      }, 3000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [botStatus?.status, user?.providerId]);

  const runAction = async (name: string, fn: () => Promise<void>) => {
    setError(null);
    setActionLoading(name);
    try {
      await fn();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al comunicar con el bot';
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const startBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/start`, {}, { timeout: 45000 });
  };

  const stopBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/stop`);
  };

  const restartBot = async () => {
    if (!user?.providerId) return;
    await api.post(`/providers/${user.providerId}/whatsapp/restart`, {}, { timeout: 45000 });
  };

  const unlinkBot = async () => {
    if (!user?.providerId) return;
    if (confirm('¿Estás seguro? Se eliminará la sesión de WhatsApp.')) {
      await api.post(`/providers/${user.providerId}/whatsapp/unlink`);
      setBotStatus((prev) => prev ? { ...prev, status: 'disconnected' } : null);
      setQrCode(null);
    }
  };

  const statusKey = botStatus?.status ?? 'disconnected';
  const config = (statusConfig[statusKey] ?? statusConfig.disconnected) as { label: string; color: string };

  return (
    <div>
      <IosHeader title="WhatsApp Bot" subtitle="Gestión del bot de pedidos" />

      {loading ? (
        <div className="flex justify-center py-8">
          <p className="text-[var(--c-text-secondary)]">Cargando estado...</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <IosCard>
            <div className="text-center">
              <p className="text-[13px] text-[var(--c-text-secondary)]">Estado Actual</p>
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
              <p className="text-[13px] text-[var(--c-text-secondary)] mb-3">Escanea el código QR</p>
              <img src={qrCode} alt="WhatsApp QR" className="mx-auto max-w-[250px] rounded-lg" />
            </IosCard>
          )}

          <IosCard>
            <h3 className="text-[17px] font-semibold mb-3">Controles</h3>
            {error && (
              <p className="text-[13px] text-[#FF3B30] mb-3 bg-[#FF3B30]/10 rounded-lg p-3">{error}</p>
            )}
            <div className="space-y-2">
              <IosButton
                className="w-full"
                onClick={() => void runAction('start', startBot)}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'start' ? '⏳ Iniciando...' : '▶️ Iniciar Bot'}
              </IosButton>
              <IosButton
                variant="secondary"
                className="w-full"
                onClick={() => void runAction('stop', stopBot)}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'stop' ? '⏳ Deteniendo...' : '⏹️ Detener Bot'}
              </IosButton>
              <IosButton
                variant="secondary"
                className="w-full"
                onClick={() => void runAction('restart', restartBot)}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'restart' ? '⏳ Reiniciando...' : '🔄 Reiniciar Bot'}
              </IosButton>
              <IosButton
                variant="destructive"
                className="w-full"
                onClick={() => void runAction('unlink', unlinkBot)}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'unlink' ? '⏳ Desvinculando...' : '🔗 Desvincular WhatsApp'}
              </IosButton>
            </div>
          </IosCard>
        </div>
      )}
    </div>
  );
}
