import { BoostController } from '../lib/BoostController';
import { MockLWPClient } from './mocks/MockLWPClient';
import * as C from '../lib/constants';

function createHandler() {
  let calls = [];
  const handler = (...args) => { calls.push(args); };
  handler.getCalls = () => calls;
  handler.getCallCount = () => calls.length;
  return handler;
}

describe('BoostController', () => {
  let controller;
  let mock;

  beforeEach(() => {
    mock = new MockLWPClient();
    controller = new BoostController(mock);
  });

  test('emits port_attached on IO attach', async () => {
    const attachedHandler = createHandler();
    controller.on('port_attached', attachedHandler);

    await controller.start();
    mock.simulatePortAttach(0x00, C.IO_MOTOR);

    expect(attachedHandler.getCallCount()).toBe(1);
    expect(attachedHandler.getCalls()[0][0]).toMatchObject({
      portKey: 'port_a',
      ioTypeId: C.IO_MOTOR,
    });
  });

  test('emits port_detached on IO detach', async () => {
    const detachedHandler = createHandler();
    controller.on('port_detached', detachedHandler);

    await controller.start();
    mock.simulatePortAttach(0x00, C.IO_MOTOR);
    mock.simulatePortDetach(0x00);

    expect(detachedHandler.getCallCount()).toBe(1);
    expect(detachedHandler.getCalls()[0][0]).toMatchObject({
      portKey: 'port_a',
    });
  });

  test('emits hub_property on battery update', async () => {
    const propertyHandler = createHandler();
    controller.on('hub_property', propertyHandler);

    await controller.start();
    const batteryMsg = [0x06, 0x00, 0x01, 0x06, 0x06, 0x00, 0x08, 0x00];
    mock.simulateNotification(batteryMsg);

    expect(propertyHandler.getCallCount()).toBe(1);
    expect(propertyHandler.getCalls()[0][0].property).toBe(C.PROP_BATTERY_VOLT);
  });

  test('emits button_pressed on button update', async () => {
    const buttonHandler = createHandler();
    controller.on('button_pressed', buttonHandler);

    await controller.start();
    const buttonMsg = [0x05, 0x00, 0x01, 0x02, 0x06, 0x01];
    mock.simulateNotification(buttonMsg);

    expect(buttonHandler.getCallCount()).toBe(1);
  });

  test('setMotorSpeed sends correct message', async () => {
    await controller.start();
    await controller.setMotorSpeed('port_a', 50);

    const lastMsg = mock.getLastSentMessage();
    expect(lastMsg[2]).toBe(C.MSG_PORT_OUTPUT);
    expect(lastMsg[5]).toBe(C.SUB_START_SPEED);
    expect(lastMsg[6]).toBe(50);
  });

  test('brakeMotor sends zero speed', async () => {
    await controller.start();
    await controller.brakeMotor('port_a');

    const lastMsg = mock.getLastSentMessage();
    expect(lastMsg[6]).toBe(0);
  });

  test('setLedColor sends correct message', async () => {
    await controller.start();
    await controller.setLedColor(255, 128, 64);

    const lastMsg = mock.getLastSentMessage();
    expect(lastMsg[2]).toBe(C.MSG_PORT_OUTPUT);
    expect(lastMsg[3]).toBe(0x63);
    expect(lastMsg[7]).toBe(255);
    expect(lastMsg[8]).toBe(128);
    expect(lastMsg[9]).toBe(64);
  });

  test('emits disconnect event', async () => {
    const disconnectHandler = createHandler();
    controller.on('disconnect', disconnectHandler);

    await controller.start();
    mock.simulateDisconnect();

    expect(disconnectHandler.getCallCount()).toBe(1);
  });

  test('port state is tracked', async () => {
    await controller.start();
    mock.simulatePortAttach(0x00, C.IO_MOTOR);

    const state = controller.getPortState();
    expect(state.ports.port_a.activeIoType).toBe(C.IO_MOTOR);
  });
});
