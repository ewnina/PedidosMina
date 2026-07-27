/* eslint-disable @typescript-eslint/no-explicit-any */

interface WWebjsChat {
  sendStateTyping(): Promise<void>;
  sendStateRecording(): Promise<void>;
}

interface WWebjsStore {
  Chat: {
    find(id: string): Promise<WWebjsChat | null>;
  };
}

declare const window: {
  Store?: WWebjsStore;
} & Record<string, any>;
