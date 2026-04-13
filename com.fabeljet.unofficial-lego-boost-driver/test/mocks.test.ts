import { MockLWPClient } from './mocks/MockLWPClient';
import { MockHomeyDevice } from './mocks/MockHomeyDevice';

describe('MockLWPClient', () => {
  let mock;
  let mockFn;

  beforeEach(() => {
    mock = new MockLWPClient();
    mockFn = { calls: [], fn: (cb) => (...args) => mockFn.calls.push(args) };
  });

  test('connect and disconnect', async () => {
    await mock.connect();
    expect(mock._connected).toBe(true);
    
    await mock.disconnect();
    expect(mock._connected).toBe(false);
  });

  test('send stores message', async () => {
    await mock.connect();
    await mock.send([0x05, 0x00, 0x01, 0x06, 0x05]);
    
    const messages = mock.getSentMessages();
    expect(messages.length).toBe(1);
    expect(messages[0][0]).toBe(0x05);
  });

  test('notification callback is invoked', async () => {
    const callback = mockFn.fn();
    await mock.subscribeToNotifications(callback);
    
    mock.simulateNotification([0x05, 0x00, 0x01, 0x06, 0x05]);
    
    expect(mockFn.calls.length).toBe(1);
  });

  test('disconnect event is emitted', async () => {
    let called = false;
    mock.on('disconnect', () => { called = true; });
    
    await mock.connect();
    mock.simulateDisconnect();
    
    expect(called).toBe(true);
  });

  test('simulatePortAttach sends correct notification', async () => {
    let received = null;
    await mock.subscribeToNotifications((msg) => { received = msg; });
    await mock.connect();
    mock.simulatePortAttach(0x00, 0x0001);
    
    expect(received[2]).toBe(0x04);
    expect(received[3]).toBe(0x00);
    expect(received[4]).toBe(0x01);
  });
});

describe('MockHomeyDevice', () => {
  let device;

  beforeEach(() => {
    device = new MockHomeyDevice();
  });

  test('addCapability adds capability', async () => {
    await device.addCapability('dim.port_a');
    
    expect(device.hasCapability('dim.port_a')).toBe(true);
    expect(device.getCapabilities()).toContain('dim.port_a');
  });

  test('setCapabilityValue stores and returns value', async () => {
    await device.addCapability('dim.port_a');
    await device.setCapabilityValue('dim.port_a', 50);
    
    expect(device.getCapabilityValue('dim.port_a')).toBe(50);
  });

  test('setCapabilityValue returns null for missing capability', () => {
    expect(device.getCapabilityValue('dim.port_a')).toBe(null);
  });

  test('removeCapability removes capability', async () => {
    await device.addCapability('dim.port_a');
    await device.removeCapability('dim.port_a');
    
    expect(device.hasCapability('dim.port_a')).toBe(false);
  });

  test('setSettings and getSettings', async () => {
    await device.setSettings({ motor_max_power: 80 });
    
    expect(device.getSettings().motor_max_power).toBe(80);
  });

  test('setData and getData', () => {
    device.setData({ id: 'test-device' });
    
    expect(device.getData().id).toBe('test-device');
  });
});
