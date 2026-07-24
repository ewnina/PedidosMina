import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IWhatsappSender } from '../interfaces/whatsapp-sender.interface';

@Injectable()
export class HttpWhatsappSender implements IWhatsappSender {
  private readonly logger = new Logger(HttpWhatsappSender.name);
  private readonly botUrl: string;

  constructor(private readonly config: ConfigService) {
    this.botUrl = this.config.get<string>('WHATSAPP_BOT_URL') ?? 'http://localhost:3001';
  }

  async sendMessage(providerId: string, recipient: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post<{ success: boolean }>(`${this.botUrl}/api/send`, {
        providerId,
        recipient,
        message,
      });
      return response.data.success;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${recipient}`, error);
      return false;
    }
  }

  async getStatus(providerId: string): Promise<{ providerId: string; status: string; lastConnectedAt: string | null }> {
    try {
      const response = await axios.get<{ providerId: string; status: string; lastConnectedAt: string | null }>(
        `${this.botUrl}/api/status/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get WhatsApp status for ${providerId}`, error);
      return { providerId, status: 'disconnected', lastConnectedAt: null };
    }
  }

  async start(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/start/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to start WhatsApp bot for ${providerId}`, error);
      return { providerId, status: 'disconnected' };
    }
  }

  async stop(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/stop/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to stop WhatsApp bot for ${providerId}`, error);
      return { providerId, status: 'disconnected' };
    }
  }

  async restart(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/restart/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to restart WhatsApp bot for ${providerId}`, error);
      return { providerId, status: 'disconnected' };
    }
  }

  async unlink(providerId: string): Promise<{ providerId: string; status: string }> {
    try {
      const response = await axios.post<{ providerId: string; status: string }>(
        `${this.botUrl}/api/unlink/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to unlink WhatsApp bot for ${providerId}`, error);
      return { providerId, status: 'disconnected' };
    }
  }

  async getQr(providerId: string): Promise<{ providerId: string; qrCode: string | null }> {
    try {
      const response = await axios.get<{ providerId: string; qrCode: string | null }>(
        `${this.botUrl}/api/qr/${providerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get QR for ${providerId}`, error);
      return { providerId, qrCode: null };
    }
  }
}
