import * as C from './constants';
import { get } from './IoTypeMap';

interface PortState {
  activeIoType: number | null;
  seenIoTypes: Record<number, { name: string; lastSeen: number }>;
}

interface PortStore {
  ports: Record<string, PortState>;
}

export class PortStateManager {
  store: PortStore;

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

  getPortKey(portId: number): string | null {
    return C.PORT_MAP[portId] || null;
  }

  getPortId(portKey: string): number | null {
    const portId = C.PORT_KEY_TO_ID[portKey];
    return portId !== undefined ? portId : null;
  }

  attach(portId: number, ioTypeId: number): { portKey: string; oldIoType: number | null; newIoType: number } | null {
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

  detach(portId: number): { portKey: string; oldIoType: number | null } | null {
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

  getActiveIoType(portKey: string): number | null {
    const portState = this.store.ports[portKey];
    return portState?.activeIoType ?? null;
  }

  getSeenIoTypes(portKey: string): Record<number, { name: string; lastSeen: number }> {
    const portState = this.store.ports[portKey];
    return portState?.seenIoTypes ?? {};
  }

  getCapabilities(portKey: string): string[] {
    const activeIoType = this.getActiveIoType(portKey);
    if (!activeIoType) {
      return [];
    }

    return get(activeIoType, portKey)?.capabilities ?? [];
  }

  getAllCapabilities(): string[] {
    const allCaps = new Set<string>();
    
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

  reset(): void {
    this.store.ports = {};
    this._initializePorts();
  }

  toJSON(): PortStore {
    return JSON.parse(JSON.stringify(this.store));
  }
}
