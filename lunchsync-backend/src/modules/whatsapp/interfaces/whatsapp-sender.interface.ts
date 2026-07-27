export abstract class IWhatsappSender {
  abstract sendMessage(providerId: string, recipient: string, message: string): Promise<boolean>;
  abstract getStatus(providerId: string): Promise<{ providerId: string; status: string; lastConnectedAt: string | null }>;
  abstract start(providerId: string): Promise<{ providerId: string; status: string }>;
  abstract stop(providerId: string): Promise<{ providerId: string; status: string }>;
  abstract restart(providerId: string): Promise<{ providerId: string; status: string }>;
  abstract unlink(providerId: string): Promise<{ providerId: string; status: string }>;
  abstract getQr(providerId: string): Promise<{ providerId: string; qrCode: string | null }>;
  abstract getChats(providerId: string): Promise<{ providerId: string; chats: { id: string; name: string | null; isGroup: boolean }[] }>;
}
