/* eslint-disable @typescript-eslint/no-explicit-any */
import Homey from 'homey';
import BoostDevice from './device.js';
import * as C from '../../lib/constants.js';

class BoostDriver extends Homey.Driver {
  async onInit() {
    this.log('BoostDriver onInit');
  }

  async onPairListDevices() {
    return [];
  }

  async onPairScan({ seconds }: { seconds: number }) {
    const serviceUuid = C.SERVICE_UUID;
    
    const foundDevices: Array<{name: string, data: {id: string}}> = [];
    
    const scan = (this.homey as any).ble.scan({ uuids: [serviceUuid], timeout: seconds * 1000 });
    
    await new Promise<void>((resolve) => {
      scan.on('device', (peripheral: any) => {
        const name = peripheral.localName || 'LEGO Boost';
        foundDevices.push({
          name,
          data: {
            id: peripheral.id,
          },
        });
      });
      
      setTimeout(() => {
        scan.stop();
        resolve();
      }, seconds * 1000);
    });

    return foundDevices;
  }

  async onPairSelectDevice({ deviceId }: { deviceId: string }) {
    const bleManager = this.homey.ble as any;
    const peripheral = await bleManager.find(deviceId);
    await peripheral.connect();
    
    await peripheral.discoverServices();
    const services = peripheral.services;
    const service = services.find((s: any) => s.uuid === C.SERVICE_UUID);
    
    if (!service) {
      await peripheral.disconnect();
      throw new Error('LEGO Boost service not found');
    }

    await service.discoverCharacteristics();
    const characteristics = service.characteristics;
    const characteristic = characteristics.find((c: any) => c.uuid === C.CHARACTERISTIC_UUID);
    
    if (!characteristic) {
      await peripheral.disconnect();
      throw new Error('LEGO Boost characteristic not found');
    }

    return {
      name: 'LEGO Boost',
      data: {
        id: peripheral.id,
      },
    };
  }
}

export default BoostDriver;