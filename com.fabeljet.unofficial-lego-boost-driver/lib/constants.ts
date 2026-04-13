// GATT
export const SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123';
export const CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123';

// Message Types
export const MSG_HUB_PROPERTIES = 0x01;
export const MSG_HUB_ACTIONS = 0x02;
export const MSG_HUB_ALERTS = 0x03;
export const MSG_HUB_ATTACHED_IO = 0x04;
export const MSG_GENERIC_ERROR = 0x05;
export const MSG_PORT_INFO_REQ = 0x21;
export const MSG_PORT_MODE_INFO_REQ = 0x22;
export const MSG_PORT_INPUT_FMT = 0x41;
export const MSG_PORT_VALUE = 0x45;
export const MSG_PORT_OUTPUT = 0x81;
export const MSG_PORT_FEEDBACK = 0x82;

// Hub Property IDs
export const PROP_ADV_NAME = 0x01;
export const PROP_BUTTON = 0x02;
export const PROP_FW_VERSION = 0x03;
export const PROP_BATTERY_VOLT = 0x06;
export const PROP_BATTERY_TYPE = 0x07;

// Hub Property Operations
export const OP_SET = 0x01;
export const OP_ENABLE_UPDATES = 0x02;
export const OP_DISABLE_UPDATES = 0x03;
export const OP_RESET = 0x04;
export const OP_REQUEST_UPDATE = 0x05;
export const OP_UPDATE = 0x06;

// IO Type IDs
export const IO_MOTOR = 0x0001;
export const IO_RGB_LIGHT = 0x0017;
export const IO_EXT_TILT = 0x0022;
export const IO_MOTION = 0x0023;
export const IO_VISION = 0x0025;
export const IO_EXT_MOTOR_TACHO = 0x0026;
export const IO_INT_MOTOR_TACHO = 0x0027;
export const IO_INT_TILT = 0x0028;

// Port IDs → Keys
export const PORT_MAP = {
  0: 'port_a',
  1: 'port_b',
  2: 'port_c',
  3: 'port_d',
  50: 'port_tilt',
  99: 'port_led',
};

// Reverse port map
export const PORT_KEY_TO_ID = Object.entries(PORT_MAP).reduce((acc, [id, key]) => {
  acc[key] = parseInt(id, 10);
  return acc;
}, {});

// Alert Types
export const ALERT_LOW_VOLTAGE = 0x01;
export const ALERT_HIGH_CURRENT = 0x02;
export const ALERT_LOW_SIGNAL = 0x03;
export const ALERT_OVER_POWER = 0x04;

// Startup/Completion
export const EXEC_IMMEDIATE_FEEDBACK = 0x11;

// Sub Commands
export const SUB_START_SPEED = 0x07;
export const SUB_WRITE_LED_RGB = 0x51;

// Defaults
export const DEFAULT_MAX_POWER = 80;
export const DEFAULT_TILT_DELTA = 2;

// Hub Attached I/O Events
export const ATTACHED_EVENT_DETACHED = 0x00;
export const ATTACHED_EVENT_ATTACHED = 0x01;
export const ATTACHED_EVENT_ATTACHED_VIRTUAL = 0x02;
