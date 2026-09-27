import { EventEmitter } from 'events';
import { parse } from './MessageParser';
import * as C from './constants';

interface BlePeripheral {
  discoverServices(): Promise<BleService[]>;
}

interface BleService {
  uuid: string;
  discoverCharacteristics(): Promise<BleCharacteristic[]>;
}

interface BleCharacteristic {
  uuid: string;
  write(buffer: Buffer): Promise<void>;
  enableNotify(): Promise<void>;
  on(event: 'data', listener: (data: Buffer) => void): void;
}

export class LWPClient extends EventEmitter {
  peripheral: BlePeripheral;
  private _connected = false;
  private _notificationCallback: ((data: Buffer) => void) | null = null;
  private _characteristic: BleCharacteristic | null = null;

  constructor(blePeripheral: BlePeripheral) {
    super();
    this.peripheral = blePeripheral;
  }

  async connect(): Promise<void> {
    const services = await this.peripheral.discoverServices();
    const service = services.find(s => s.uuid === C.SERVICE_UUID);
    if (!service) {
      throw new Error('Service not found');
    }

    const characteristics = await service.discoverCharacteristics();
    this._characteristic = characteristics.find(c => c.uuid === C.CHARACTERISTIC_UUID);
    if (!this._characteristic) {
      throw new Error('Characteristic not found');
    }

    this._connected = true;
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._characteristic = null;
  }

  async send(messageBytes: number[] | Uint8Array): Promise<void> {
    if (!this._connected || !this._characteristic) {
      throw new Error('Not connected');
    }

    const buffer = Buffer.from(messageBytes);
    await this._characteristic.write(buffer);
  }

  async subscribeToNotifications(callback: (data: Buffer) => void): Promise<void> {
    if (!this._connected || !this._characteristic) {
      throw new Error('Not connected');
    }

    this._notificationCallback = callback;
    await this._characteristic.enableNotify();
    this._characteristic.on('data', (data: Buffer) => {
      if (this._notificationCallback) {
        this._notificationCallback(data);
      }
    });
  }

  _handleNotification(data: Buffer): void {
    if (this._notificationCallback) {
      this._notificationCallback(data);
    }
  }

  parseAndEmit(data: Buffer): ReturnType<typeof parse> | null {
    try {
      const message = parse(data);
      return message;
    } catch (err) {
      this.emit('error', err);
      return null;
    }
  }
}
