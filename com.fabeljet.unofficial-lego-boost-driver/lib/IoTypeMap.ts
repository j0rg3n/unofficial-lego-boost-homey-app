import * as C from './constants';

const IO_TYPE_MAP = {
  [C.IO_MOTOR]: {
    name: 'Motor',
    capabilities: (portKey) => [`dim.${portKey}`],
  },
  [C.IO_RGB_LIGHT]: {
    name: 'RGB Light',
    capabilities: (portKey) => ['light_hue', 'light_saturation', 'light_brightness'],
  },
  [C.IO_EXT_TILT]: {
    name: 'External Tilt Sensor',
    capabilities: (portKey) => [`measure_tilt.${portKey}`],
  },
  [C.IO_MOTION]: {
    name: 'Motion Sensor',
    capabilities: (portKey) => [`alarm_motion.${portKey}`],
  },
  [C.IO_VISION]: {
    name: 'Vision Sensor',
    capabilities: (portKey) => [`measure_luminance.${portKey}`, `measure_distance.${portKey}`],
  },
  [C.IO_EXT_MOTOR_TACHO]: {
    name: 'External Motor with Tacho',
    capabilities: (portKey) => [`dim.${portKey}`, `measure_power.${portKey}`],
  },
  [C.IO_INT_MOTOR_TACHO]: {
    name: 'Internal Motor with Tacho',
    capabilities: (portKey) => [`dim.${portKey}`, `measure_power.${portKey}`],
  },
  [C.IO_INT_TILT]: {
    name: 'Internal Tilt',
    capabilities: (portKey) => ['measure_tilt_x', 'measure_tilt_y', 'measure_tilt_z'],
  },
};

export function get(ioTypeId, portKey) {
  const ioType = IO_TYPE_MAP[ioTypeId];
  if (!ioType) {
    return null;
  }

  return {
    name: ioType.name,
    capabilities: ioType.capabilities(portKey),
  };
}

export function isKnown(ioTypeId) {
  return ioTypeId in IO_TYPE_MAP;
}

export function getAllIoTypes() {
  return Object.entries(IO_TYPE_MAP).map(([id, data]) => ({
    id: parseInt(id, 16),
    name: data.name,
  }));
}
