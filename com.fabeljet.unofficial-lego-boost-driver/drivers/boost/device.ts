import Homey from 'homey';
import { BoostController } from '../../lib/BoostController.js';
import { LWPClient } from '../../lib/LWPClient.js';
import { MockLWPClient } from '../../test/mocks/MockLWPClient.js';
import * as C from '../../lib/constants.js';

class BoostDevice extends Homey.Device {
  async onInit() {
    this._settings = {
      motor_max_power: C.DEFAULT_MAX_POWER,
      tilt_delta: C.DEFAULT_TILT_DELTA,
    };

    this._activePorts = {};

    this.client = this._createClient();
    this.controller = new BoostController(this.client);

    this._bindControllerEvents();
  }

  _createClient() {
    if (this.homey.mock) {
      const mock = new MockLWPClient();
      return mock;
    }

    const peripheral = this.homey.ble.peripheral;
    return new LWPClient(peripheral);
  }

  _bindControllerEvents() {
    this.controller.on('hub_property', ({ property, value }) => {
      if (property === C.PROP_BATTERY_VOLT) {
        const batteryPercent = Math.min(100, Math.round((value / 8000) * 100));
        this.setCapabilityValue('measure_battery', batteryPercent);
      }
    });

    this.controller.on('button_pressed', () => {
      this.setCapabilityValue('button', true);
      setTimeout(() => this.setCapabilityValue('button', false), 500);
    });

    this.controller.on('port_attached', ({ portKey, ioTypeId }) => {
      this._handlePortAttached(portKey, ioTypeId);
    });

    this.controller.on('port_detached', ({ portKey }) => {
      this._handlePortDetached(portKey);
    });

    this.controller.on('port_value', ({ portKey, capabilityId, value }) => {
      this._handlePortValue(portKey, capabilityId, value);
    });

    this.controller.on('alert', ({ type, status }) => {
      if (type === C.ALERT_LOW_VOLTAGE && status === 0x01) {
        this.homey.flow.getDeviceTriggerCard('low_battery').trigger(this);
      }
    });

    this.controller.on('error', (err) => {
      this.error('Controller error:', err.message);
    });

    this.controller.on('disconnect', () => {
      this.setUnavailable('Disconnected');
    });
  }

  async _handlePortAttached(portKey: string, ioTypeId: number) {
    const ioTypeInfo = this._getIoTypeInfo(ioTypeId, portKey);
    if (!ioTypeInfo) return;

    for (const capabilityId of ioTypeInfo.capabilities) {
      if (!this.hasCapability(capabilityId)) {
        await this.addCapability(capabilityId);
      }
    }

    this._activePorts = this._activePorts || {};
    this._activePorts[portKey] = ioTypeId;
  }

  async _handlePortDetached(portKey: string) {
    const activeIoType = this.controller.portState.getActiveIoType(portKey);
    if (!activeIoType) return;

    const ioTypeInfo = this._getIoTypeInfo(activeIoType, portKey);
    if (!ioTypeInfo) return;

    for (const capabilityId of ioTypeInfo.capabilities) {
      await this.setCapabilityValue(capabilityId, null);
    }

    if (this._activePorts) {
      delete this._activePorts[portKey];
    }
  }

  _handlePortValue(portKey: string, capabilityId: string, value: number) {
    if (portKey === 'port_tilt') {
      if (capabilityId === 'measure_tilt_x' || capabilityId === 'x') {
        this.setCapabilityValue('measure_tilt_x', value);
      } else if (capabilityId === 'measure_tilt_y' || capabilityId === 'y') {
        this.setCapabilityValue('measure_tilt_y', value);
      } else if (capabilityId === 'measure_tilt_z' || capabilityId === 'z') {
        this.setCapabilityValue('measure_tilt_z', value);
      }
    } else {
      this.setCapabilityValue(capabilityId, value);
    }
  }

  _getIoTypeInfo(ioTypeId: number, portKey: string) {
    const { get } = require('../../lib/IoTypeMap.js');
    return get(ioTypeId, portKey);
  }

  async onConnect() {
    try {
      await this.controller.start();
      this.setAvailable();
    } catch (err) {
      this.error('Connection failed:', err.message);
      throw err;
    }
  }

  async onDisconnect() {
    await this.controller.stop();
  }

  async onSettings({ newSettings }: { newSettings: Record<string, any> }) {
    this._settings = { ...this._settings, ...newSettings };
  }

  async setMotorSpeed(portKey: string, speed: number) {
    const maxPower = this._settings.motor_max_power || C.DEFAULT_MAX_POWER;
    await this.controller.setMotorSpeed(portKey, speed, maxPower);
  }

  async setLedColor(r: number, g: number, b: number) {
    await this.controller.setLedColor(r, g, b);
  }

  getActivePorts() {
    return this._activePorts || {};
  }
}

export default BoostDevice;
