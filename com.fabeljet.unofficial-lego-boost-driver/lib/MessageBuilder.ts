import * as C from './constants';

export function hubPropertyRequest(property, operation) {
  const payload = [property, operation];
  return buildMessage(C.MSG_HUB_PROPERTIES, payload);
}

export function portInputFormatSetup(portId, mode, deltaInterval, notificationsEnabled) {
  const deltaBytes = new Uint8Array(4);
  const view = new DataView(deltaBytes.buffer);
  view.setUint32(0, deltaInterval, true);

  const payload = [
    portId,
    mode,
    ...deltaBytes,
    notificationsEnabled,
  ];
  return buildMessage(C.MSG_PORT_INPUT_FMT, payload);
}

export function startSpeed(portId, speed, maxPower = C.DEFAULT_MAX_POWER) {
  const clampedSpeed = Math.max(-100, Math.min(100, speed));
  const clampedPower = Math.max(0, Math.min(100, maxPower));

  const payload = [
    portId,
    C.EXEC_IMMEDIATE_FEEDBACK,
    C.SUB_START_SPEED,
    clampedSpeed,
    clampedPower,
    0x00,
  ];
  return buildMessage(C.MSG_PORT_OUTPUT, payload);
}

export function writeLedRgb(r, g, b) {
  const clampedR = Math.max(0, Math.min(255, r));
  const clampedG = Math.max(0, Math.min(255, g));
  const clampedB = Math.max(0, Math.min(255, b));

  const payload = [
    0x63,
    C.EXEC_IMMEDIATE_FEEDBACK,
    C.SUB_WRITE_LED_RGB,
    0x01,
    clampedR,
    clampedG,
    clampedB,
  ];
  return buildMessage(C.MSG_PORT_OUTPUT, payload);
}

export function disconnect() {
  const payload = [0x01];
  return buildMessage(C.MSG_HUB_ACTIONS, payload);
}

export function subscribeToAlerts(enable) {
  const payload = [enable ? C.OP_ENABLE_UPDATES : C.OP_DISABLE_UPDATES];
  return buildMessage(C.MSG_HUB_ALERTS, payload);
}

function buildMessage(messageType, payload) {
  const length = 3 + payload.length;
  const buffer = Buffer.alloc(length);
  
  let offset = 0;
  
  if (length > 0x7F) {
    buffer[offset++] = (length & 0x7F) | 0x80;
    buffer[offset++] = (length >> 7) & 0xFF;
  } else {
    buffer[offset++] = length;
  }
  
  buffer[offset++] = 0x00;
  buffer[offset++] = messageType;
  
  for (let i = 0; i < payload.length; i++) {
    buffer[offset++] = payload[i];
  }
  
  return buffer;
}
