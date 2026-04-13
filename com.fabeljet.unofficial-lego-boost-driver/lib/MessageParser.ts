import * as C from './constants';

export function parse(buffer) {
  if (!buffer || buffer.length < 2) {
    throw new Error('Buffer too short');
  }

  let offset = 0;
  let length = buffer[offset++];

  if (length & 0x80) {
    length = (length & 0x7F) | (buffer[offset++] << 7);
  }

  if (buffer.length < length) {
    throw new Error(`Buffer length ${buffer.length} < expected ${length}`);
  }

  const hubId = buffer[offset++];
  const messageType = buffer[offset++];
  const payload = buffer.slice(offset);

  switch (messageType) {
    case C.MSG_HUB_PROPERTIES:
      return parseHubProperties(hubId, payload);
    case C.MSG_HUB_ACTIONS:
      return parseHubActions(hubId, payload);
    case C.MSG_HUB_ALERTS:
      return parseHubAlerts(hubId, payload);
    case C.MSG_HUB_ATTACHED_IO:
      return parseHubAttachedIO(hubId, payload);
    case C.MSG_GENERIC_ERROR:
      return parseGenericError(hubId, payload);
    case C.MSG_PORT_VALUE:
      return parsePortValue(hubId, payload);
    case C.MSG_PORT_FEEDBACK:
      return parsePortFeedback(hubId, payload);
    default:
      return {
        messageType,
        hubId,
        payload: Array.from(payload),
        raw: buffer,
      };
  }
}

function parseHubProperties(hubId, payload) {
  if (payload.length < 2) {
    return { messageType: C.MSG_HUB_PROPERTIES, hubId, payload };
  }

  const property = payload[0];
  const operation = payload[1];
  const data = payload.slice(2);

  let value = null;
  let valueType = null;

  switch (property) {
    case C.PROP_ADV_NAME:
      valueType = 'string';
      const nullIndex = data.indexOf(0x00);
      value = nullIndex > 0 ? data.slice(0, nullIndex).toString('utf8') : data.toString('utf8');
      break;
    case C.PROP_BUTTON:
      valueType = 'number';
      value = data[0];
      break;
    case C.PROP_FW_VERSION:
      valueType = 'string';
      value = data.map(b => String.fromCharCode(b)).join('').replace(/\0+$/, '');
      break;
    case C.PROP_BATTERY_VOLT:
      valueType = 'number';
      value = data.readUInt16LE(0);
      break;
    case C.PROP_BATTERY_TYPE:
      valueType = 'number';
      value = data[0];
      break;
    default:
      valueType = 'raw';
      value = Array.from(data);
  }

  return {
    messageType: C.MSG_HUB_PROPERTIES,
    hubId,
    property,
    operation,
    value,
    valueType,
  };
}

function parseHubActions(hubId, payload) {
  if (payload.length < 1) {
    return { messageType: C.MSG_HUB_ACTIONS, hubId, payload };
  }

  const action = payload[0];
  const data = payload.slice(1);

  return {
    messageType: C.MSG_HUB_ACTIONS,
    hubId,
    action,
    data: Array.from(data),
  };
}

function parseHubAlerts(hubId, payload) {
  if (payload.length < 2) {
    return { messageType: C.MSG_HUB_ALERTS, hubId, payload };
  }

  const alertType = payload[0];
  const status = payload[1];

  return {
    messageType: C.MSG_HUB_ALERTS,
    hubId,
    alertType,
    status,
  };
}

function parseHubAttachedIO(hubId, payload) {
  if (payload.length < 2) {
    return { messageType: C.MSG_HUB_ATTACHED_IO, hubId, payload };
  }

  const portId = payload[0];
  const event = payload[1];
  let ioTypeId = null;
  let hwRevision = null;
  let swRevision = null;

  if (event === C.ATTACHED_EVENT_ATTACHED || event === C.ATTACHED_EVENT_ATTACHED_VIRTUAL) {
    if (payload.length >= 11) {
      ioTypeId = payload.readUInt16LE(2);
      hwRevision = payload.readInt32LE(4);
      swRevision = payload.readInt32LE(8);
    }
  }

  return {
    messageType: C.MSG_HUB_ATTACHED_IO,
    hubId,
    portId,
    event,
    ioTypeId,
    hwRevision,
    swRevision,
  };
}

function parseGenericError(hubId, payload) {
  if (payload.length < 2) {
    return { messageType: C.MSG_GENERIC_ERROR, hubId, payload };
  }

  const errorCode = payload[0];
  const commandType = payload[1];

  return {
    messageType: C.MSG_GENERIC_ERROR,
    hubId,
    errorCode,
    commandType,
  };
}

function parsePortValue(hubId, payload) {
  if (payload.length < 2) {
    return { messageType: C.MSG_PORT_VALUE, hubId, payload };
  }

  const portId = payload[0];
  const mode = payload[1];
  const data = payload.slice(2);

  let value = null;
  let valueType = 'raw';

  switch (mode) {
    case 0x00:
      if (data.length >= 2) {
        value = data.readInt16LE(0);
        valueType = 'int16';
      }
      break;
    case 0x01:
      if (data.length >= 4) {
        value = data.readInt32LE(0);
        valueType = 'int32';
      }
      break;
    case 0x02:
      if (data.length >= 1) {
        value = data[0];
        valueType = 'uint8';
      }
      break;
    case 0x03:
      if (data.length >= 2) {
        value = data.readUInt16LE(0);
        valueType = 'uint16';
      }
      break;
    case 0x04:
      if (data.length >= 4) {
        value = data.readFloatLE(0);
        valueType = 'float';
      }
      break;
    default:
      value = Array.from(data);
  }

  return {
    messageType: C.MSG_PORT_VALUE,
    hubId,
    portId,
    mode,
    value,
    valueType,
    data: Array.from(data),
  };
}

function parsePortFeedback(hubId, payload) {
  if (payload.length < 3) {
    return { messageType: C.MSG_PORT_FEEDBACK, hubId, payload };
  }

  const portId = payload[0];
  const feedback = payload[1];
  const executionTime = payload.readUInt16LE(2);

  return {
    messageType: C.MSG_PORT_FEEDBACK,
    hubId,
    portId,
    feedback,
    executionTime,
  };
}
