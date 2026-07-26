import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IWhatsappSender } from '../interfaces/whatsapp-sender.interface';

const TIMEOUT_MS = 15_000;
const START_TIMEOUT_MS = 30_000;

@Injectable()
export class HttpWhatsappSender implements IWhatsappSender {
  private readonly logger = new Logger(HttpWhatsappSender.name);
  private readonly botUrl: string;

  constructor(private readonly config: ConfigService) {
    this.botUrl = this.config.get<string>('WHATSAPP_BOT_URL') ?? 'http://localhost:3001';
  }

  async sendMessage(providerId: string, recipient: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post<{ success: boolean; error?: string }>(
        `${this.botUrl}/api/send`,
        { providerId, recipient, message },
        { headers: this.secretHeader(), timeout: TIMEOUT_MS },
      );
      return response.data.success;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.error(`Failed to send WhatsApp message to ${recipient}: ${detail}`);
      return false;
    }
  }

  async getStatus(providerId: string): Promise<{ providerId: string; status: string; lastConnectedAt: string | null }> {
    try {
      const response = await axios.get<{ providerId: string; status: string; lastConnectedAt: string | null }>(
        `${this.botUrl}/api/status/${providerId}`,
        { headers: this.secretHeader(), timeout: TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.warn(`Failed to get WhatsApp status for ${providerId}: ${detail}`);
      return { providerId, status: 'disconnected', lastConnectedAt: null };
    }
  }

  async start(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/start/${providerId}`,
        {},
        { headers: this.secretHeader(), timeout: START_TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.error(`Failed to start WhatsApp bot for ${providerId}: ${detail}`);
      return { providerId, status: 'disconnected' };
    }
  }

  async stop(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/stop/${providerId}`,
        {},
        { headers: this.secretHeader(), timeout: TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.error(`Failed to stop WhatsApp bot for ${providerId}: ${detail}`);
      return { providerId, status: 'disconnected' };
    }
  }

  async restart(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/restart/${providerId}`,
        {},
        { headers: this.secretHeader(), timeout: START_TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.error(`Failed to restart WhatsApp bot for ${providerId}: ${detail}`);
      return { providerId, status: 'disconnected' };
    }
  }

  async unlink(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/unlink/${providerId}`,
        {},
        { headers: this.secretHeader(), timeout: TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.error(`Failed to unlink WhatsApp bot for ${providerId}: ${detail}`);
      return { providerId, status: 'disconnected' };
    }
  }

  async getQr(providerId: string): Promise<{ providerId: string; qrCode: string | null }> {
    try {
      const response = await axios.get<{ providerId: string; qrCode: string | null }>(
        `${this.botUrl}/api/qr/${providerId}`,
        { headers: this.secretHeader(), timeout: TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const detail = this.extractError(error);
      this.logger.warn(`Failed to get QR for ${providerId}: ${detail}`);
      return { providerId, qrCode: null };
    }
  }

  private secretHeader(): Record<string, string> {
    return { 'x-bot-secret': this.config.get<string>('BOT_INTERNAL_SECRET') ?? 'lunchsync-bot-internal' };
  }

  private extractError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data;
      if (!status) {
        return `Bot no disponible (${error.code ?? 'ECONNREFUSED'})`;
      }
      const msg = typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : String(body ?? '');
      return `HTTP ${status}: ${msg}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
