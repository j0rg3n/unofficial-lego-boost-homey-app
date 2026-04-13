import { PortStateManager } from '../lib/PortStateManager';
import * as C from '../lib/constants';

describe('PortStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new PortStateManager();
  });

  describe('getPortKey', () => {
    test('returns correct port key', () => {
      expect(manager.getPortKey(0x00)).toBe('port_a');
      expect(manager.getPortKey(0x01)).toBe('port_b');
      expect(manager.getPortKey(0x02)).toBe('port_c');
      expect(manager.getPortKey(0x03)).toBe('port_d');
      expect(manager.getPortKey(0x32)).toBe('port_tilt');
      expect(manager.getPortKey(0x63)).toBe('port_led');
    });

    test('returns null for unknown port', () => {
      expect(manager.getPortKey(0xFF)).toBeNull();
    });
  });

  describe('getPortId', () => {
    test('returns correct port id', () => {
      expect(manager.getPortId('port_a')).toBe(0x00);
      expect(manager.getPortId('port_b')).toBe(0x01);
      expect(manager.getPortId('port_c')).toBe(0x02);
      expect(manager.getPortId('port_d')).toBe(0x03);
      expect(manager.getPortId('port_tilt')).toBe(0x32);
      expect(manager.getPortId('port_led')).toBe(0x63);
    });

    test('returns null for unknown port key', () => {
      expect(manager.getPortId('port_x')).toBeNull();
    });
  });

  describe('attach', () => {
    test('attaches new IO type', () => {
      const result = manager.attach(0x00, C.IO_MOTOR);
      
      expect(result.portKey).toBe('port_a');
      expect(result.oldIoType).toBeNull();
      expect(result.newIoType).toBe(C.IO_MOTOR);
      expect(manager.getActiveIoType('port_a')).toBe(C.IO_MOTOR);
    });

    test('tracks seen IO types', () => {
      manager.attach(0x00, C.IO_MOTOR);
      manager.attach(0x00, C.IO_EXT_MOTOR_TACHO);
      
      const seen = manager.getSeenIoTypes('port_a');
      expect(Object.keys(seen)).toContain(C.IO_MOTOR.toString());
      expect(Object.keys(seen)).toContain(C.IO_EXT_MOTOR_TACHO.toString());
    });

    test('returns old IO type on swap', () => {
      manager.attach(0x00, C.IO_MOTOR);
      const result = manager.attach(0x00, C.IO_EXT_MOTOR_TACHO);
      
      expect(result.oldIoType).toBe(C.IO_MOTOR);
      expect(result.newIoType).toBe(C.IO_EXT_MOTOR_TACHO);
      expect(manager.getActiveIoType('port_a')).toBe(C.IO_EXT_MOTOR_TACHO);
    });

    test('returns null for unknown port', () => {
      const result = manager.attach(0xFF, C.IO_MOTOR);
      
      expect(result).toBeNull();
    });
  });

  describe('detach', () => {
    test('detaches IO type', () => {
      manager.attach(0x00, C.IO_MOTOR);
      const result = manager.detach(0x00);
      
      expect(result.portKey).toBe('port_a');
      expect(result.oldIoType).toBe(C.IO_MOTOR);
      expect(manager.getActiveIoType('port_a')).toBeNull();
    });

    test('returns null for unknown port', () => {
      const result = manager.detach(0xFF);
      
      expect(result).toBeNull();
    });
  });

  describe('getCapabilities', () => {
    test('returns capabilities for active IO type', () => {
      manager.attach(0x00, C.IO_MOTOR);
      
      const caps = manager.getCapabilities('port_a');
      expect(caps).toContain('dim.port_a');
    });

    test('returns empty array when detached', () => {
      manager.attach(0x00, C.IO_MOTOR);
      manager.detach(0x00);
      
      const caps = manager.getCapabilities('port_a');
      expect(caps).toEqual([]);
    });
  });

  describe('getAllCapabilities', () => {
    test('returns static capabilities', () => {
      const caps = manager.getAllCapabilities();
      
      expect(caps).toContain('dim.port_c');
      expect(caps).toContain('dim.port_d');
      expect(caps).toContain('measure_tilt_x');
      expect(caps).toContain('light_hue');
    });
  });

  describe('reset', () => {
    test('clears all port state', () => {
      manager.attach(0x00, C.IO_MOTOR);
      manager.attach(0x01, C.IO_VISION);
      
      manager.reset();
      
      expect(manager.getActiveIoType('port_a')).toBeNull();
      expect(manager.getActiveIoType('port_b')).toBeNull();
    });
  });

  describe('toJSON', () => {
    test('returns serializable store', () => {
      manager.attach(0x00, C.IO_MOTOR);
      
      const json = manager.toJSON();
      
      expect(json.ports.port_a.activeIoType).toBe(C.IO_MOTOR);
      expect(json.ports.port_a.seenIoTypes[C.IO_MOTOR]).toBeDefined();
    });
  });
});
