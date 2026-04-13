import { EventEmitter } from 'events';
import { parse } from './MessageParser';
import * as C from './constants';

export class LWPClient extends EventEmitter {
  constructor(blePeripheral) {
    super();
    this.peripheral = blePeripheral;
    this._connected = false;
    this._notificationCallback = null;
    this._characteristic = null;
  }

  async connect() {
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
    return Promise.resolve();
  }

  async disconnect() {
    this._connected = false;
    this._characteristic = null;
    return Promise.resolve();
  }

  async send(messageBytes) {
    if (!this._connected || !this._characteristic) {
      throw new Error('Not connected');
    }

    const buffer = Buffer.from(messageBytes);
    await this._characteristic.write(buffer);
    return Promise.resolve();
  }

  async subscribeToNotifications(callback) {
    if (!this._connected || !this._characteristic) {
      throw new Error('Not connected');
    }

    this._notificationCallback = callback;
    await this._characteristic.enableNotify();
    this._characteristic.on('data', (data) => {
      if (this._notificationCallback) {
        this._notificationCallback(data);
      }
    });

    return Promise.resolve();
  }

  _handleNotification(data) {
    if (this._notificationCallback) {
      this._notificationCallback(data);
    }
  }

  parseAndEmit(data) {
    try {
      const message = parse(data);
      return message;
    } catch (err) {
      this.emit('error', err);
      return null;
    }
  }
}
