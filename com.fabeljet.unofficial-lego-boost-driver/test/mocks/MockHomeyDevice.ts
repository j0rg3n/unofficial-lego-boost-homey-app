import { EventEmitter } from 'events';

export class MockHomeyDevice extends EventEmitter {
  constructor() {
    super();
    this._capabilities = [];
    this._capabilityValues = {};
    this._settings = {};
    this._data = {};
    this._name = 'Mock Device';
    this._state = {};
  }

  setData(data) {
    this._data = data;
  }

  getData() {
    return this._data;
  }

  setName(name) {
    this._name = name;
  }

  getName() {
    return this._name;
  }

  async addCapability(capabilityId) {
    if (!this._capabilities.includes(capabilityId)) {
      this._capabilities.push(capabilityId);
      this._capabilityValues[capabilityId] = null;
    }
    return Promise.resolve();
  }

  async removeCapability(capabilityId) {
    const index = this._capabilities.indexOf(capabilityId);
    if (index > -1) {
      this._capabilities.splice(index, 1);
      delete this._capabilityValues[capabilityId];
    }
    return Promise.resolve();
  }

  hasCapability(capabilityId) {
    return this._capabilities.includes(capabilityId);
  }

  getCapabilities() {
    return [...this._capabilities];
  }

  async setCapabilityValue(capabilityId, value) {
    this._capabilityValues[capabilityId] = value;
    return Promise.resolve();
  }

  getCapabilityValue(capabilityId) {
    return this._capabilityValues[capabilityId] ?? null;
  }

  async setSettings(settings) {
    this._settings = { ...this._settings, ...settings };
    return Promise.resolve();
  }

  getSettings() {
    return { ...this._settings };
  }

  getSetting(key) {
    return this._settings[key];
  }

  setUnavailable(reason) {
    this._unavailable = reason;
  }

  setAvailable() {
    this._unavailable = null;
  }

  log(...args) {
    console.log('[MockDevice]', ...args);
  }

  error(...args) {
    console.error('[MockDevice]', ...args);
  }
}
