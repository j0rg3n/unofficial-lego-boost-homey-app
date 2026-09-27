import { EventEmitter } from 'events';
import { parse } from './MessageParser';
import * as MB from './MessageBuilder';
import * as C from './constants';
import { PortStateManager } from './PortStateManager';
import { get } from './IoTypeMap';
import { LWPClient } from './LWPClient';
import { MockLWPClient } from '../test/mocks/MockLWPClient';

interface BoostControllerEvents {
  hub_property: (data: { property: number; value: number }) => void;
  port_attached: (data: { portKey: string; ioTypeId: number; ioTypeName: string }) => void;
  port_detached: (data: { portKey: string }) => void;
  port_value: (data: { portKey: string; ioTypeId: number; capabilityId: string; value: number }) => void;
  button_pressed: () => void;
  alert: (data: { type: number; status: number }) => void;
  error: (err: Error) => void;
  disconnect: () => void;
  reconnect: () => void;
  motor_complete: (data: { portId: number }) => void;
}

export class BoostController extends EventEmitter {
  client: LWPClient | MockLWPClient;
  portState: PortStateManager;
  private _running = false;

  constructor(client: LWPClient | MockLWPClient) {
    super();
    this.client = client;
    this.portState = new PortStateManager();
  }

  async start() {
    if (this._running) return;
    
    this._running = true;

    await this.client.connect();
    await this.client.subscribeToNotifications(this._handleMessage.bind(this));
    this.client.on('disconnect', this._handleDisconnect.bind(this));

    await this._requestHubProperties();
    await this._subscribeToAlerts();

    return Promise.resolve();
  }

  async stop() {
    this._running = false;
    await this.client.disconnect();
    return Promise.resolve();
  }

  async _handleMessage(data) {
    const message = this.client.parseAndEmit(data);
    if (!message) return;

    switch (message.messageType) {
      case C.MSG_HUB_PROPERTIES:
        this._handleHubProperty(message);
        break;
      case C.MSG_HUB_ATTACHED_IO:
        this._handleHubAttachedIO(message);
        break;
      case C.MSG_HUB_ALERTS:
        this._handleHubAlert(message);
        break;
      case C.MSG_PORT_VALUE:
        this._handlePortValue(message);
        break;
      case C.MSG_PORT_FEEDBACK:
        this._handlePortFeedback(message);
        break;
      case C.MSG_GENERIC_ERROR:
        this._handleError(message);
        break;
    }
  }

  _handleHubProperty(message) {
    if (message.property === C.PROP_BUTTON && message.operation === C.OP_UPDATE) {
      this.emit('button_pressed');
    }

    this.emit('hub_property', {
      property: message.property,
      value: message.value,
      operation: message.operation,
    });
  }

  _handleHubAttachedIO(message) {
    const portKey = this.portState.getPortKey(message.portId);
    if (!portKey) return;

    if (message.event === C.ATTACHED_EVENT_ATTACHED || message.event === C.ATTACHED_EVENT_ATTACHED_VIRTUAL) {
      const attachResult = this.portState.attach(message.portId, message.ioTypeId);
      if (attachResult) {
        this.emit('port_attached', {
          portKey,
          ioTypeId: message.ioTypeId,
          ioTypeName: get(message.ioTypeId, portKey)?.name || 'Unknown',
        });
      }

      this._setupPortNotifications(message.portId);
    } else if (message.event === C.ATTACHED_EVENT_DETACHED) {
      this.portState.detach(message.portId);
      this.emit('port_detached', { portKey });
    }
  }

  _handleHubAlert(message) {
    this.emit('alert', {
      type: message.alertType,
      status: message.status,
    });
  }

  _handlePortValue(message) {
    const portKey = this.portState.getPortKey(message.portId);
    if (!portKey) return;

    const ioTypeId = this.portState.getActiveIoType(portKey);
    const ioTypeInfo = get(ioTypeId, portKey);

    if (ioTypeInfo) {
      const capabilityId = ioTypeInfo.capabilities[0];
      this.emit('port_value', {
        portKey,
        ioTypeId,
        capabilityId,
        value: message.value,
      });
    }
  }

  _handlePortFeedback(message) {
    if (message.feedback === 0x01) {
      this.emit('motor_complete', { portId: message.portId });
    }
  }

  _handleError(message) {
    this.emit('error', new Error(`Generic error: ${message.errorCode}`));
  }

  async _handleDisconnect() {
    this.emit('disconnect');
    if (this._running) {
      setTimeout(() => this._reconnect(), 1000);
    }
  }

  async _reconnect() {
    try {
      await this.start();
      this.emit('reconnect');
    } catch (err) {
      this.emit('error', err);
    }
  }

  async _requestHubProperties() {
    await this.client.send(MB.hubPropertyRequest(C.PROP_BATTERY_VOLT, C.OP_REQUEST_UPDATE));
    await this.client.send(MB.hubPropertyRequest(C.PROP_BUTTON, C.OP_ENABLE_UPDATES));
  }

  async _subscribeToAlerts() {
    await this.client.send(MB.subscribeToAlerts(true));
  }

  async _setupPortNotifications(portId) {
    await this.client.send(MB.portInputFormatSetup(portId, 0x00, 1, 0x01));
  }

  async setMotorSpeed(portKey, speed, maxPower = C.DEFAULT_MAX_POWER) {
    const portId = this.portState.getPortId(portKey);
    if (portId === null) {
      throw new Error(`Unknown port: ${portKey}`);
    }

    const message = MB.startSpeed(portId, speed, maxPower);
    await this.client.send(Array.from(message));
    return Promise.resolve();
  }

  async brakeMotor(portKey) {
    return this.setMotorSpeed(portKey, 0, 0);
  }

  async setLedColor(r, g, b) {
    const message = MB.writeLedRgb(r, g, b);
    await this.client.send(Array.from(message));
    return Promise.resolve();
  }

  async requestBattery() {
    const message = MB.hubPropertyRequest(C.PROP_BATTERY_VOLT, C.OP_REQUEST_UPDATE);
    await this.client.send(Array.from(message));
    return Promise.resolve();
  }

  getPortState() {
    return this.portState.toJSON();
  }
}
