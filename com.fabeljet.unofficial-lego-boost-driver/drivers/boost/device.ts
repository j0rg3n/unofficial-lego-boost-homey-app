/* eslint-disable @typescript-eslint/no-explicit-any */
import Homey from 'homey';
import { BoostController } from '../../lib/BoostController.js';
import { LWPClient } from '../../lib/LWPClient.js';
import { MockLWPClient } from '../../test/mocks/MockLWPClient.js';
import * as C from '../../lib/constants.js';

class BoostDevice extends Homey.Device {
  private client: LWPClient | MockLWPClient | null = null;
  private controller: BoostController | null = null;
  private _settings: Record<string, any> = {
    motor_max_power: C.DEFAULT_MAX_POWER,
    tilt_delta: C.DEFAULT_TILT_DELTA,
  };
  private _activePorts: Record<string, number> = {};

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

  _createClient(): LWPClient | MockLWPClient {
    const homeyAny = this.homey as any;
    if (homeyAny.mock) {
      const mock = new MockLWPClient();
      return mock;
    }

    const peripheral = homeyAny.ble.peripheral;
    return new LWPClient(peripheral);
  }

  _bindControllerEvents() {
    if (!this.controller) return;

    this.controller.on('hub_property', ({ property, value }: { property: number; value: number }) => {
      if (property === C.PROP_BATTERY_VOLT) {
        const batteryPercent = Math.min(100, Math.round((value / 8000) * 100));
        this.setCapabilityValue('measure_battery', batteryPercent);
      }
    });

    this.controller.on('button_pressed', () => {
      this.setCapabilityValue('button', true);
      setTimeout(() => this.setCapabilityValue('button', false), 500);
    });

    this.controller.on('port_attached', ({ portKey, ioTypeId }: { portKey: string; ioTypeId: number }) => {
      this._handlePortAttached(portKey, ioTypeId);
    });

    this.controller.on('port_detached', ({ portKey }: { portKey: string }) => {
      this._handlePortDetached(portKey);
    });

    this.controller.on('port_value', ({ portKey, capabilityId, value }: { portKey: string; capabilityId: string; value: number }) => {
      this._handlePortValue(portKey, capabilityId, value);
    });

    this.controller.on('alert', ({ type, status }: { type: number; status: number }) => {
      if (type === C.ALERT_LOW_VOLTAGE && status === 0x01) {
        (this.homey as any).flow.getTriggerCard('low_battery')?.trigger(this);
      }
    });

    this.controller.on('error', (err: Error) => {
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
    if (!this.controller) return;
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
    if (!this.controller) return;
    try {
      await this.controller.start();
      this.setAvailable();
    } catch (err: any) {
      this.error('Connection failed:', err.message);
      throw err;
    }
  }

  async onDisconnect() {
    if (this.controller) {
      await this.controller.stop();
    }
  }

  async onSettings({ newSettings }: { newSettings: Record<string, any> }) {
    this._settings = { ...this._settings, ...newSettings };
  }

  async setMotorSpeed(portKey: string, speed: number) {
    const maxPower = this._settings.motor_max_power || C.DEFAULT_MAX_POWER;
    if (this.controller) {
      await this.controller.setMotorSpeed(portKey, speed, maxPower);
    }
  }

  async setLedColor(r: number, g: number, b: number) {
    if (this.controller) {
      await this.controller.setLedColor(r, g, b);
    }
  }

  getActivePorts() {
    return this._activePorts || {};
  }
}

export default BoostDevice;