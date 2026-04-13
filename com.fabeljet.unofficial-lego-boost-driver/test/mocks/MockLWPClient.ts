import { EventEmitter } from 'events';
import { parse } from '../../lib/MessageParser';

export class MockLWPClient extends EventEmitter {
  _connected: boolean = false;
  _notificationCallback: ((data: Buffer) => void) | null = null;
  _sentMessages: Buffer[] = [];

  constructor() {
    super();
  }

  async connect() {
    this._connected = true;
    return Promise.resolve();
  }

  async disconnect() {
    this._connected = false;
    this.emit('disconnect');
    return Promise.resolve();
  }

  async send(messageBytes: number[] | Uint8Array) {
    if (!this._connected) {
      throw new Error('Not connected');
    }
    this._sentMessages.push(Buffer.from(messageBytes));
    return Promise.resolve();
  }

  async subscribeToNotifications(callback: (data: Buffer) => void) {
    this._notificationCallback = callback;
    return Promise.resolve();
  }

  simulateNotification(messageBytes: number[] | Uint8Array) {
    if (this._notificationCallback) {
      this._notificationCallback(Buffer.from(messageBytes));
    }
  }

  simulateDisconnect() {
    this._connected = false;
    this.emit('disconnect');
  }

  simulateReconnect() {
    this._connected = true;
  }

  simulatePortAttach(portId: number, ioTypeId: number) {
    const message = [
      9,
      0x00,
      0x04,
      portId,
      0x01,
      ioTypeId & 0xFF,
      (ioTypeId >> 8) & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    this.simulateNotification(message);
  }

  simulatePortDetach(portId: number) {
    const message = [
      4,
      0x00,
      0x04,
      portId,
      0x00,
    ];
    this.simulateNotification(message);
  }

  getLastSentMessage() {
    return this._sentMessages[this._sentMessages.length - 1];
  }

  getSentMessages() {
    return [...this._sentMessages];
  }

  clearSentMessages() {
    this._sentMessages = [];
  }

  parseAndEmit(data: Buffer) {
    try {
      return parse(data);
    } catch (err) {
      this.emit('error', err);
      return null;
    }
  }
}
