import Homey from 'homey';
import * as C from './lib/constants';

class LegoBoostApp extends Homey.App {
  async onInit() {
    this.log('LEGO Boost Driver has been initialized');

    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggerButton = this.homey.flow.getTriggerCard('button_pressed');
    if (triggerButton) {
      triggerButton.registerRunListener(async (device: any, args: any) => {
        return Promise.resolve();
      });
    }

    const triggerMotorStalled = this.homey.flow.getTriggerCard('motor_stalled');
    if (triggerMotorStalled) {
      triggerMotorStalled.registerRunListener(async (device: any, args: any) => {
        return { port: args?.port || 'unknown' };
      });
    }

    const triggerMotion = this.homey.flow.getTriggerCard('motion_detected');
    if (triggerMotion) {
      triggerMotion.registerRunListener(async (device: any, args: any) => {
        return { port: args?.port || 'unknown' };
      });
    }

    const triggerTilt = this.homey.flow.getTriggerCard('tilt_changed');
    if (triggerTilt) {
      triggerTilt.registerRunListener(async (device: any, args: any) => {
        return {
          x: args?.x || 0,
          y: args?.y || 0,
          z: args?.z || 0,
        };
      });
    }

    const conditionPortHasDevice = this.homey.flow.getConditionCard('port_has_device');
    if (conditionPortHasDevice) {
      conditionPortHasDevice.registerRunListener(async (device: any, args: any) => {
        const activePorts = device.getActivePorts();
        const portKey = `port_${args.port.toLowerCase()}`;
        return activePorts && activePorts[portKey] !== undefined;
      });
    }

    const actionSetMotorSpeed = this.homey.flow.getActionCard('set_motor_speed');
    if (actionSetMotorSpeed) {
      actionSetMotorSpeed.registerRunListener(async (device: any, args: any) => {
        const portKey = `port_${args.port.toLowerCase()}`;
        await device.setMotorSpeed(portKey, args.speed);
        return Promise.resolve();
      });
    }

    const actionBrakeMotor = this.homey.flow.getActionCard('brake_motor');
    if (actionBrakeMotor) {
      actionBrakeMotor.registerRunListener(async (device: any, args: any) => {
        const portKey = `port_${args.port.toLowerCase()}`;
        await device.setMotorSpeed(portKey, 0);
        return Promise.resolve();
      });
    }

    const actionSetLedColor = this.homey.flow.getActionCard('set_led_color');
    if (actionSetLedColor) {
      actionSetLedColor.registerRunListener(async (device: any, args: any) => {
        const { r, g, b } = this._hexToRgb(args.color);
        await device.setLedColor(r, g, b);
        return Promise.resolve();
      });
    }

    const actionResetHistory = this.homey.flow.getActionCard('reset_port_history');
    if (actionResetHistory) {
      actionResetHistory.registerRunListener(async (device: any, args: any) => {
        device.controller.portState.reset();
        return Promise.resolve();
      });
    }
  }

  _hexToRgb(hex: string): { r: number, g: number, b: number } {
    if (!hex || typeof hex !== 'string') {
      return { r: 255, g: 255, b: 255 };
    }
    
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
}

export default LegoBoostApp;
