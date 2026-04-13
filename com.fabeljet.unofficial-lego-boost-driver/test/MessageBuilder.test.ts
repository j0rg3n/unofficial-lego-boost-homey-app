import * as C from '../lib/constants';
import * as MB from '../lib/MessageBuilder';

describe('MessageBuilder', () => {
  describe('hubPropertyRequest', () => {
    test('battery request', () => {
      const msg = MB.hubPropertyRequest(C.PROP_BATTERY_VOLT, C.OP_REQUEST_UPDATE);
      
      expect(msg[0]).toBe(0x05);
      expect(msg[1]).toBe(0x00);
      expect(msg[2]).toBe(C.MSG_HUB_PROPERTIES);
      expect(msg[3]).toBe(C.PROP_BATTERY_VOLT);
      expect(msg[4]).toBe(C.OP_REQUEST_UPDATE);
    });

    test('button subscribe', () => {
      const msg = MB.hubPropertyRequest(C.PROP_BUTTON, C.OP_ENABLE_UPDATES);
      
      expect(msg[0]).toBe(0x05);
      expect(msg[2]).toBe(C.MSG_HUB_PROPERTIES);
      expect(msg[3]).toBe(C.PROP_BUTTON);
      expect(msg[4]).toBe(C.OP_ENABLE_UPDATES);
    });
  });

  describe('portInputFormatSetup', () => {
    test('basic setup', () => {
      const msg = MB.portInputFormatSetup(0x00, 0x00, 1, 0x01);
      
      expect(msg[0]).toBe(0x0A);
      expect(msg[1]).toBe(0x00);
      expect(msg[2]).toBe(C.MSG_PORT_INPUT_FMT);
      expect(msg[3]).toBe(0x00);
      expect(msg[4]).toBe(0x00);
      expect(msg[5]).toBe(0x01);
      expect(msg[6]).toBe(0x00);
      expect(msg[7]).toBe(0x00);
      expect(msg[8]).toBe(0x00);
      expect(msg[9]).toBe(0x01);
    });
  });

  describe('startSpeed', () => {
    test('positive speed', () => {
      const msg = MB.startSpeed(0x00, 50);
      
      expect(msg[0]).toBe(0x09);
      expect(msg[1]).toBe(0x00);
      expect(msg[2]).toBe(C.MSG_PORT_OUTPUT);
      expect(msg[3]).toBe(0x00);
      expect(msg[4]).toBe(C.EXEC_IMMEDIATE_FEEDBACK);
      expect(msg[5]).toBe(C.SUB_START_SPEED);
      expect(msg[6]).toBe(50);
      expect(msg[7]).toBe(C.DEFAULT_MAX_POWER);
      expect(msg[8]).toBe(0x00);
    });

    test('negative speed', () => {
      const msg = MB.startSpeed(0x01, -100);
      
      expect(msg[6]).toBe(156);
    });

    test('zero speed (brake)', () => {
      const msg = MB.startSpeed(0x02, 0);
      
      expect(msg[6]).toBe(0);
    });

    test('clamps speed > 100', () => {
      const msg = MB.startSpeed(0x00, 150);
      
      expect(msg[6]).toBe(100);
    });

    test('clamps speed < -100', () => {
      const msg = MB.startSpeed(0x00, -150);
      
      expect(msg[6]).toBe(-100 + 256);
    });

    test('custom maxPower', () => {
      const msg = MB.startSpeed(0x00, 50, 50);
      
      expect(msg[7]).toBe(50);
    });

    test('clamps maxPower > 100', () => {
      const msg = MB.startSpeed(0x00, 50, 150);
      
      expect(msg[7]).toBe(100);
    });
  });

  describe('writeLedRgb', () => {
    test('sets correct color', () => {
      const msg = MB.writeLedRgb(255, 0, 0);
      
      expect(msg[0]).toBe(0x0A);
      expect(msg[1]).toBe(0x00);
      expect(msg[2]).toBe(C.MSG_PORT_OUTPUT);
      expect(msg[3]).toBe(0x63);
      expect(msg[4]).toBe(C.EXEC_IMMEDIATE_FEEDBACK);
      expect(msg[5]).toBe(C.SUB_WRITE_LED_RGB);
      expect(msg[6]).toBe(0x01);
      expect(msg[7]).toBe(255);
      expect(msg[8]).toBe(0);
      expect(msg[9]).toBe(0);
    });

    test('clamps values', () => {
      const msg = MB.writeLedRgb(300, -50, 128);
      
      expect(msg[7]).toBe(255);
      expect(msg[8]).toBe(0);
      expect(msg[9]).toBe(128);
    });
  });

  describe('disconnect', () => {
    test('sends disconnect command', () => {
      const msg = MB.disconnect();
      
      expect(msg[0]).toBe(0x04);
      expect(msg[1]).toBe(0x00);
      expect(msg[2]).toBe(C.MSG_HUB_ACTIONS);
      expect(msg[3]).toBe(0x01);
    });
  });

  describe('subscribeToAlerts', () => {
    test('enable', () => {
      const msg = MB.subscribeToAlerts(true);
      
      expect(msg[0]).toBe(0x04);
      expect(msg[2]).toBe(C.MSG_HUB_ALERTS);
      expect(msg[3]).toBe(C.OP_ENABLE_UPDATES);
    });

    test('disable', () => {
      const msg = MB.subscribeToAlerts(false);
      
      expect(msg[3]).toBe(C.OP_DISABLE_UPDATES);
    });
  });
});
