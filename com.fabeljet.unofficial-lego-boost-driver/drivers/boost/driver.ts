import Homey from 'homey';
import BoostDevice from './device.js';
import * as C from '../../lib/constants.js';

class BoostDriver extends Homey.Driver {
  async onInit() {
    this.log('BoostDriver onInit');
  }

  async onPairListDevices({ devices }: { devices: any[] }) {
    return devices;
  }

  async onPairScan({ filters, seconds }: { filters: any, seconds: number }) {
    const serviceUuid = C.SERVICE_UUID;
    
    const foundDevices: Array<{name: string, data: {id: string}}> = [];
    
    this.homey.ble.scan({ uuids: [serviceUuid], timeout: seconds * 1000 })
      .on('device', (peripheral: any) => {
        const name = peripheral.localName || 'LEGO Boost';
        foundDevices.push({
          name,
          data: {
            id: peripheral.id,
          },
        });
      });

    return foundDevices;
  }

  async onPairSelectDevice({ deviceId }: { deviceId: string }) {
    const peripheral = await this.homey.ble.find(deviceId);
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
