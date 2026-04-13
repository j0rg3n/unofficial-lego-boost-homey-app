import * as C from '../lib/constants';
import { get, isKnown } from '../lib/IoTypeMap';

describe('IoTypeMap', () => {
  describe('get', () => {
    test('returns motor capabilities', () => {
      const result = get(C.IO_MOTOR, 'port_a');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('Motor');
      expect(result.capabilities).toContain('dim.port_a');
    });

    test('returns RGB light capabilities', () => {
      const result = get(C.IO_RGB_LIGHT, 'port_led');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('RGB Light');
      expect(result.capabilities).toContain('light_hue');
      expect(result.capabilities).toContain('light_saturation');
      expect(result.capabilities).toContain('light_brightness');
    });

    test('returns external tilt capabilities', () => {
      const result = get(C.IO_EXT_TILT, 'port_a');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('External Tilt Sensor');
      expect(result.capabilities).toContain('measure_tilt.port_a');
    });

    test('returns motion sensor capabilities', () => {
      const result = get(C.IO_MOTION, 'port_b');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('Motion Sensor');
      expect(result.capabilities).toContain('alarm_motion.port_b');
    });

    test('returns vision sensor capabilities', () => {
      const result = get(C.IO_VISION, 'port_a');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('Vision Sensor');
      expect(result.capabilities).toContain('measure_luminance.port_a');
      expect(result.capabilities).toContain('measure_distance.port_a');
    });

    test('returns external motor with tacho capabilities', () => {
      const result = get(C.IO_EXT_MOTOR_TACHO, 'port_a');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('External Motor with Tacho');
      expect(result.capabilities).toContain('dim.port_a');
      expect(result.capabilities).toContain('measure_power.port_a');
    });

    test('returns internal motor with tacho capabilities', () => {
      const result = get(C.IO_INT_MOTOR_TACHO, 'port_c');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('Internal Motor with Tacho');
      expect(result.capabilities).toContain('dim.port_c');
      expect(result.capabilities).toContain('measure_power.port_c');
    });

    test('returns internal tilt capabilities', () => {
      const result = get(C.IO_INT_TILT, 'port_tilt');
      
      expect(result).not.toBeNull();
      expect(result.name).toBe('Internal Tilt');
      expect(result.capabilities).toContain('measure_tilt_x');
      expect(result.capabilities).toContain('measure_tilt_y');
      expect(result.capabilities).toContain('measure_tilt_z');
    });

    test('returns null for unknown IO type', () => {
      const result = get(0xFFFF, 'port_a');
      
      expect(result).toBeNull();
    });

    test('maps port letters correctly', () => {
      const resultA = get(C.IO_MOTOR, 'port_a');
      const resultB = get(C.IO_MOTOR, 'port_b');
      
      expect(resultA.capabilities).toContain('dim.port_a');
      expect(resultB.capabilities).toContain('dim.port_b');
      expect(resultA.capabilities).not.toContain('dim.port_b');
    });
  });

  describe('isKnown', () => {
    test('returns true for known IO types', () => {
      expect(isKnown(C.IO_MOTOR)).toBe(true);
      expect(isKnown(C.IO_RGB_LIGHT)).toBe(true);
      expect(isKnown(C.IO_VISION)).toBe(true);
      expect(isKnown(C.IO_INT_TILT)).toBe(true);
    });

    test('returns false for unknown IO type', () => {
      expect(isKnown(0xFFFF)).toBe(false);
      expect(isKnown(0x0000)).toBe(false);
    });
  });
});
