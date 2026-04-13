import { parse } from '../lib/MessageParser';
import * as C from '../lib/constants';

describe('MessageParser', () => {
  describe('parse', () => {
    test('throws on buffer too short', () => {
      expect(() => parse(Buffer.from([0x05]))).toThrow('Buffer too short');
    });

    test('throws on incomplete 2-byte length', () => {
      const buffer = Buffer.from([0x81, 0x01, 0x00, 0x01, 0x06, 0x05]);
      expect(() => parse(buffer)).toThrow('Buffer length');
    });

    test('parses Hub Properties - battery', () => {
      const buffer = Buffer.from([0x05, 0x00, 0x01, 0x06, 0x05, 0x00, 0x08]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_PROPERTIES);
      expect(result.property).toBe(C.PROP_BATTERY_VOLT);
      expect(result.operation).toBe(C.OP_REQUEST_UPDATE);
      expect(result.value).toBe(0x0800);
      expect(result.valueType).toBe('number');
    });

    test('parses Hub Properties - button', () => {
      const buffer = Buffer.from([0x05, 0x00, 0x01, 0x02, 0x02, 0x01]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_PROPERTIES);
      expect(result.property).toBe(C.PROP_BUTTON);
      expect(result.operation).toBe(C.OP_ENABLE_UPDATES);
      expect(result.value).toBe(0x01);
    });

    test('parses Hub Properties - name', () => {
      const buffer = Buffer.from([0x09, 0x00, 0x01, 0x01, 0x05, 0x42, 0x4F, 0x4F, 0x53, 0x54, 0x00]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_PROPERTIES);
      expect(result.property).toBe(C.PROP_ADV_NAME);
      expect(result.operation).toBe(C.OP_REQUEST_UPDATE);
      expect(result.value).toBe('BOOST');
    });

    test('parses Hub Attached I/O - detached', () => {
      const buffer = Buffer.from([0x04, 0x00, 0x04, 0x00, 0x00]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_ATTACHED_IO);
      expect(result.portId).toBe(0x00);
      expect(result.event).toBe(C.ATTACHED_EVENT_DETACHED);
      expect(result.ioTypeId).toBe(null);
    });

    test('parses Hub Attached I/O - attached', () => {
      const buffer = Buffer.from([
        0x0D, 0x00, 0x04, 0x00, 0x01, 0x01, 0x00,
        0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
      ]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_ATTACHED_IO);
      expect(result.portId).toBe(0x00);
      expect(result.event).toBe(C.ATTACHED_EVENT_ATTACHED);
      expect(result.ioTypeId).toBe(0x0001);
      expect(result.hwRevision).toBe(0x00000001);
      expect(result.swRevision).toBe(0x00000001);
    });

    test('parses Hub Alerts', () => {
      const buffer = Buffer.from([0x04, 0x00, 0x03, 0x01, 0x01]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_ALERTS);
      expect(result.alertType).toBe(0x01);
      expect(result.status).toBe(0x01);
    });

    test('parses Port Value - int16', () => {
      const buffer = Buffer.from([0x06, 0x00, 0x45, 0x00, 0x00, 0x50, 0x00]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_PORT_VALUE);
      expect(result.portId).toBe(0x00);
      expect(result.mode).toBe(0x00);
      expect(result.value).toBe(0x0050);
      expect(result.valueType).toBe('int16');
    });

    test('parses Port Value - negative int16', () => {
      const buffer = Buffer.from([0x06, 0x00, 0x45, 0x00, 0x00, 0xF6, 0xFF]);
      const result = parse(buffer);

      expect(result.value).toBe(-10);
    });

    test('parses Port Feedback', () => {
      const buffer = Buffer.from([0x06, 0x00, 0x82, 0x00, 0x01, 0x00, 0x10]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_PORT_FEEDBACK);
      expect(result.portId).toBe(0x00);
      expect(result.feedback).toBe(0x01);
      expect(result.executionTime).toBe(0x1000);
    });

    test('parses Generic Error', () => {
      const buffer = Buffer.from([0x04, 0x00, 0x05, 0x01, 0x81]);
      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_GENERIC_ERROR);
      expect(result.errorCode).toBe(0x01);
      expect(result.commandType).toBe(0x81);
    });

    test('handles unknown message type', () => {
      const buffer = Buffer.from([0x04, 0x00, 0xFF, 0x01, 0x02]);
      const result = parse(buffer);

      expect(result.messageType).toBe(0xFF);
      expect(result.hubId).toBe(0x00);
    });

    test('handles 2-byte length encoding', () => {
      const buffer = Buffer.alloc(150);
      buffer[0] = 0x81;
      buffer[1] = 0x01;
      buffer[2] = 0x00;
      buffer[3] = 0x01;
      buffer[4] = 0x06;
      buffer[5] = 0x05;

      const result = parse(buffer);

      expect(result.messageType).toBe(C.MSG_HUB_PROPERTIES);
    });
  });
});
