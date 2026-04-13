import * as C from '../lib/constants';
import { MockLWPClient } from './mocks/MockLWPClient';

const mockPeripheral = {
  services: null,
  _discoverServices() {
    this.services = [
      { uuid: C.SERVICE_UUID, characteristics: null }
    ];
    return Promise.resolve(this.services);
  },
};

class MockBLECharacteristic {
  constructor() {
    this._value = null;
    this._notifyEnabled = false;
    this._callbacks = [];
  }

  async write(buffer) {
    return Promise.resolve();
  }

  async enableNotify() {
    this._notifyEnabled = true;
    return Promise.resolve();
  }

  on(event, callback) {
    if (event === 'data') {
      this._callbacks.push(callback);
    }
  }

  _emitData(data) {
    for (const cb of this._callbacks) {
      cb(data);
    }
  }
}

describe('LWPClient', () => {
  test('placeholder - uses MockLWPClient', () => {
    const mock = new MockLWPClient();
    expect(mock).toBeDefined();
  });
});
