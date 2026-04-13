import * as C from './constants';
import { get } from './IoTypeMap';

export class PortStateManager {
  constructor() {
    this.store = {
      ports: {},
    };
    this._initializePorts();
  }

  _initializePorts() {
    const portKeys = ['port_a', 'port_b', 'port_c', 'port_d', 'port_tilt', 'port_led'];
    for (const key of portKeys) {
      if (!this.store.ports[key]) {
        this.store.ports[key] = {
          activeIoType: null,
          seenIoTypes: {},
        };
      }
    }
  }

  getPortKey(portId) {
    return C.PORT_MAP[portId] || null;
  }

  getPortId(portKey) {
    const portId = C.PORT_KEY_TO_ID[portKey];
    return portId !== undefined ? portId : null;
  }

  attach(portId, ioTypeId) {
    const portKey = this.getPortKey(portId);
    if (!portKey) {
      return null;
    }

    const portState = this.store.ports[portKey];
    if (!portState) {
      return null;
    }

    const oldIoType = portState.activeIoType;
    portState.activeIoType = ioTypeId;
    portState.seenIoTypes[ioTypeId] = {
      name: get(ioTypeId, portKey)?.name || 'Unknown',
      lastSeen: Date.now(),
    };

    return {
      portKey,
      oldIoType,
      newIoType: ioTypeId,
    };
  }

  detach(portId) {
    const portKey = this.getPortKey(portId);
    if (!portKey) {
      return null;
    }

    const portState = this.store.ports[portKey];
    if (!portState) {
      return null;
    }

    const oldIoType = portState.activeIoType;
    portState.activeIoType = null;

    return {
      portKey,
      oldIoType,
    };
  }

  getActiveIoType(portKey) {
    const portState = this.store.ports[portKey];
    return portState?.activeIoType ?? null;
  }

  getSeenIoTypes(portKey) {
    const portState = this.store.ports[portKey];
    return portState?.seenIoTypes ?? {};
  }

  getCapabilities(portKey) {
    const activeIoType = this.getActiveIoType(portKey);
    if (!activeIoType) {
      return [];
    }

    return get(activeIoType, portKey)?.capabilities ?? [];
  }

  getAllCapabilities() {
    const allCaps = new Set();
    
    for (const portKey of ['port_c', 'port_d', 'port_tilt', 'port_led']) {
      if (portKey === 'port_c' || portKey === 'port_d') {
        allCaps.add(`dim.${portKey}`);
        allCaps.add(`measure_power.${portKey}`);
      } else if (portKey === 'port_tilt') {
        allCaps.add('measure_tilt_x');
        allCaps.add('measure_tilt_y');
        allCaps.add('measure_tilt_z');
      } else if (portKey === 'port_led') {
        allCaps.add('light_hue');
        allCaps.add('light_saturation');
        allCaps.add('light_brightness');
      }
    }

    return Array.from(allCaps);
  }

  reset() {
    this.store.ports = {};
    this._initializePorts();
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.store));
  }
}
