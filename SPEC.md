# SPEC.md — Unofficial LEGO Boost Homey Driver

**App name:** Unofficial LEGO Boost Homey Driver  
**App icon:** 🐱‍💻 (coding cat emoji)  
**SDK:** Homey Apps SDK v3 (Node.js — **TypeScript required**)  
**Protocol:** LEGO Wireless Protocol (LWP) 3.0 over BLE  
**Language:** TypeScript only. No JavaScript permitted.  

---

## 1. Overview

A Homey app that connects a **LEGO Boost Move Hub** to **Homey Pro (2019)** via Bluetooth Low Energy, enabling home automation triggers and actions based on hub sensors, motors, and attached peripherals.

Homey Pro acts as the **BLE central** (GATT client). The Boost hub is the **BLE peripheral** (GATT server). All communication passes through a single GATT characteristic using the LEGO Wireless Protocol message format.

---

## 2. Architecture

### 2.1 Layered Design

```
LWPClient  ←→  BoostController  ←→  HomeyDevice
(BLE only)    (business logic)    (Homey SDK only)
```

No layer imports from another layer's dependencies:
- **`LWPClient`** — BLE connection, raw message send/receive. Zero Homey imports.
- **`BoostController`** — port state machine, capability mapping, event routing. Zero BLE and zero Homey imports.
- **`HomeyDevice`** — thin adapter: translates controller events into capability updates and Flow triggers. The only layer that touches the Homey SDK.

### 2.2 Directory Structure

**All source files MUST be TypeScript (.ts). No JavaScript (.js) files permitted.**

```
app/
├── app.json
├── app.ts
├── drivers/
│   └── boost/
│       ├── driver.ts           # Pairing flow only
│       └── device.ts          # HomeyDevice — thin adapter
├── lib/
│   ├── LWPClient.ts           # BLE + LWP framing layer
│   ├── BoostController.ts     # Business logic, port state machine
│   ├── PortStateManager.ts    # Per-port IO type history + active state
│   ├── MessageParser.ts       # Parses raw LWP notification bytes → structured messages
│   ├── MessageBuilder.ts      # Builds raw LWP downstream byte arrays
│   ├── IoTypeMap.ts           # Maps IO Type ID → capability set + metadata
│   └── constants.ts           # UUIDs, message type bytes, IO type IDs, defaults
└── test/
    ├── mocks/
    │   ├── MockLWPClient.ts   # Implements LWPClient interface, no real BLE
    │   └── MockHomeyDevice.ts # Implements Homey SDK Device interface
    ├── MessageParser.test.ts
    ├── MessageBuilder.test.ts
    ├── IoTypeMap.test.ts
    ├── PortStateManager.test.ts
    ├── BoostController.test.ts
    ├── LWPClient.test.ts
    └── e2e/
        └── pairing.spec.ts    # Playwright tests for pairing UI
```

---

## 3. BLE / LWP Protocol

### 3.1 GATT

| | Value |
|---|---|
| Service UUID | `00001623-1212-EFDE-1623-785FEABCD123` |
| Characteristic UUID | `00001624-1212-EFDE-1623-785FEABCD123` |
| Characteristic properties | Write Without Response (downstream), Notify (upstream) |

All communication — hub properties, port commands, sensor values — flows through this single characteristic. Subscribe to notifications on connect; write downstream messages as write-without-response.

### 3.2 Message Format

Every message shares a common 3-byte header:

| Byte | Field | Notes |
|---|---|---|
| 0 | Length | Total message length in bytes. If bit 7 set, length spans 2 bytes (MSB follows) |
| 1 | Hub ID | Always `0x00` in standalone mode |
| 2 | Message Type | See §3.3 |
| 3+ | Payload | Type-specific |

### 3.3 Message Types Used

| Type | Value | Direction | Purpose |
|---|---|---|---|
| Hub Properties | `0x01` | Down + Up | Read hub name, battery, button state |
| Hub Actions | `0x02` | Down + Up | Disconnect, power off |
| Hub Alerts | `0x03` | Down + Up | Subscribe to low battery, overcurrent |
| Hub Attached I/O | `0x04` | Up | Port attach/detach events |
| Generic Error | `0x05` | Up | Error responses |
| Port Info Request | `0x21` | Down | Request port mode info |
| Port Mode Info Request | `0x22` | Down | Request mode-specific info |
| Port Input Format Setup | `0x41` | Down | Enable notifications for a port/mode |
| Port Value (Single) | `0x45` | Up | Sensor value update |
| Port Output Command | `0x81` | Down | Motor commands |
| Port Output Feedback | `0x82` | Up | Command completion feedback |

### 3.4 Hub Attached I/O

Sent by hub spontaneously on connect and whenever a device is attached or detached.

| Event | Value |
|---|---|
| Detached | `0x00` |
| Attached | `0x01` |
| Attached Virtual | `0x02` |

Payload for Attached: Port ID, Event, IO Type ID (UInt16), HW revision (Int32), SW revision (Int32).

### 3.5 Boost Hub Port Layout

| Port ID | Type | Description |
|---|---|---|
| `0x00` | External | Port A (connector) |
| `0x01` | External | Port B (connector) |
| `0x02` | Internal | Motor C (left) |
| `0x03` | Internal | Motor D (right) |
| `0x32` (50) | Internal | Tilt sensor |
| `0x63` (99) | Internal | RGB LED |

### 3.6 IO Type IDs (relevant subset)

| IO Type ID | Device | Capabilities added |
|---|---|---|
| `0x0001` | Motor (basic) | `dim.port_X` (speed -100..100) |
| `0x0017` | RGB Light | `light_hue`, `light_saturation`, `light_brightness` |
| `0x0022` | External Tilt Sensor | `measure_tilt.port_X` |
| `0x0023` | Motion Sensor | `alarm_motion.port_X` |
| `0x0025` | Vision Sensor (Color+Distance) | `measure_luminance.port_X`, `measure_distance.port_X` |
| `0x0026` | External Motor with Tacho | `dim.port_X`, `measure_power.port_X` |
| `0x0027` | Internal Motor with Tacho | `dim.port_X`, `measure_power.port_X` |
| `0x0028` | Internal Tilt | `measure_tilt_x`, `measure_tilt_y`, `measure_tilt_z` |

`X` in capability IDs is replaced with the port letter (`a`, `b`, `c`, `d`) derived from the Port ID.

### 3.7 Port Input Format Setup

To receive value notifications from a sensor port, send message type `0x41`:

```
[length, 0x00, 0x41, portId, mode, deltaInterval(4 bytes LE), notificationsEnabled(1)]
```

- `mode`: typically `0x00` for most sensors (see per-device documentation)
- `deltaInterval`: `1` for live data (use with care on noisy sensors), `1` recommended for motion/tilt
- `notificationsEnabled`: `0x01`

### 3.8 Motor Output Command

Message type `0x81`, Sub Command `0x07` (StartSpeed):

```
[length, 0x00, 0x81, portId, 0x11, 0x07, speed, maxPower, useProfile]
```

- `speed`: Int8, -100..100 (negative = reverse, 0 = hold/brake)
- `maxPower`: UInt8, 0..100
- `useProfile`: `0x00`
- Startup/Completion byte `0x11` = execute immediately, send feedback

### 3.9 RGB LED Command

Via `WriteDirectModeData` (Sub Command `0x51`):

```
[length, 0x00, 0x81, 0x63, 0x11, 0x51, 0x00, colorIndex]
```

Or via direct RGB mode (mode `0x01`):

```
[length, 0x00, 0x81, 0x63, 0x11, 0x51, 0x01, r, g, b]
```

### 3.10 Hub Property Requests

Request battery voltage:
```
[0x05, 0x00, 0x01, 0x06, 0x05]   // property=0x06 (battery), op=0x05 (request update)
```

Subscribe to battery updates:
```
[0x05, 0x00, 0x01, 0x06, 0x02]   // op=0x02 (enable updates)
```

Subscribe to button:
```
[0x05, 0x00, 0x01, 0x02, 0x02]   // property=0x02 (button), op=0x02
```

---

## 4. Port State Management

### 4.1 Design

Port capabilities are **never removed** during normal operation (only on explicit reset). Once a capability is added for a port, it persists in Homey permanently until reset. This ensures Flow cards built around a capability remain valid even when the device is unplugged or a different device is attached.

At any point each port has exactly **one active IO type** (or none if detached). When a different IO type is detected on a port than what was previously active, the old IO type's capabilities are deactivated (values nulled) and the new type's capabilities are activated.

### 4.2 Store Shape

```ts
interface PortState {
  activeIoType: number | null      // null when detached
  seenIoTypes: Record<number, { name: string, lastSeen: number }>
}

interface PortStore {
  ports: Record<string, PortState>
}
```

### 4.3 On `Hub Attached I/O` — Attached Event

1. Resolve port key from Port ID (e.g. `0x00` → `port_a`)
2. Look up IO Type ID in `IoTypeMap` → get capability list
3. If any capability in list is not yet added → call `addCapability()`
4. If `activeIoType` was a different IO type → null out that type's capability values
5. Set `activeIoType` to new IO Type ID
6. Upsert `seenIoTypes` entry with `lastSeen = Date.now()`
7. Send `Port Input Format Setup` (`0x41`) for sensor ports to enable notifications
8. Re-register capability listeners for output ports (motors)

### 4.4 On `Hub Attached I/O` — Detached Event

1. Null out all capability values for `activeIoType` on that port
2. Set `activeIoType: null`
3. Do **not** remove capabilities

### 4.5 Reset Action

Exposed as a `button` type in device settings (not a Flow action card). On press:

1. Call `removeCapability()` for all dynamically added port capabilities
2. Clear `ports` in store
3. Rebuild from currently physically attached devices (re-process any pending `Hub Attached I/O` state)

---

## 5. Homey Capabilities

### 5.1 Static capabilities (always present)

| Capability | Notes |
|---|---|
| `measure_battery` | From Hub Property `0x06`, updated on subscription |
| `button` | Hub button state, from Hub Property `0x02` |
| `light_hue` | RGB LED hue (internal port `0x63`) |
| `light_saturation` | RGB LED saturation |
| `light_brightness` | RGB LED brightness |
| `dim.port_c` | Internal motor C speed (-100..100) |
| `dim.port_d` | Internal motor D speed (-100..100) |
| `measure_tilt_x` | Internal tilt sensor X axis |
| `measure_tilt_y` | Internal tilt sensor Y axis |
| `measure_tilt_z` | Internal tilt sensor Z axis |

### 5.2 Dynamic capabilities (added on first sight, never removed until reset)

Per external port (`port_a`, `port_b`), depending on IO type history:

| IO Type | Capabilities |
|---|---|
| Motor (basic) | `dim.port_X` |
| External Motor w/ Tacho | `dim.port_X`, `measure_power.port_X` |
| Vision Sensor | `measure_luminance.port_X`, `measure_distance.port_X` |
| Motion Sensor | `alarm_motion.port_X` |
| External Tilt Sensor | `measure_tilt.port_X` |

### 5.3 Null values

When a port is detached, all its capability values are set to `null`. Homey renders `null` as `—` in the UI.

---

## 6. Flow Cards

### 6.1 Triggers

| ID | Title | Tokens |
|---|---|---|
| `button_pressed` | Hub button pressed | — |
| `motor_stalled` | Motor stalled | `port` (string) |
| `motion_detected` | Motion detected on port | `port` (string) |
| `tilt_changed` | Hub tilt changed | `x`, `y`, `z` (numbers) |
| Standard capability triggers | From all capabilities above | — |

### 6.2 Conditions

| ID | Title |
|---|---|
| `port_has_device` | Port [A/B] has a device attached |
| `port_device_is` | Port [A/B] device type is [selector] |
| Standard capability conditions | From all capabilities |

### 6.3 Actions

| ID | Title | Args |
|---|---|---|
| `set_motor_speed` | Set motor speed on port | port selector, speed (-100..100) |
| `brake_motor` | Brake motor on port | port selector |
| `set_led_color` | Set LED color | color picker |
| `reset_port_history` | Reset port capability history | — (this is also in settings) |
| Standard light/dim actions | From capabilities | — |

---

## 7. Device Settings

| Setting ID | Type | Default | Notes |
|---|---|---|---|
| `motor_max_power` | number | `80` | Max power % sent with motor speed commands (0–100) |
| `tilt_delta` | number | `2` | Min tilt change (degrees) to trigger a notification |
| `reset_port_history` | button | — | Removes all dynamic capabilities and clears port store |

---

## 8. Pairing Flow

No account or password required. Pure BLE discovery.

1. **Scan** — Homey discovers BLE devices advertising service UUID `00001623-...`. Hub must be in advertising mode (press green button).
2. **Select** — User picks hub from list (shown by advertised name).
3. **Connect** — Homey connects, subscribes to characteristic notifications.
4. **Handshake** — Hub sends `Hub Attached I/O` messages for all currently connected devices. App processes these and adds initial capabilities.
5. **Done** — Device stored with `{ id: peripheralId }` in `getData()`.

---

## 9. Connection Lifecycle

```
onInit()
  └─ connect()
       ├─ ble.find(peripheralId)
       ├─ advertisement.connect()
       ├─ subscribeToNotifications()
       ├─ requestHubProperties()      // battery + button
       ├─ subscribeToAlerts()         // low battery, overcurrent
       └─ hub spontaneously sends Hub Attached I/O for all ports

peripheral.on('disconnect')
  └─ mark all ports as detached (null activeIoType, null capability values)
  └─ schedule reconnect with exponential backoff
       └─ on success: re-subscribe, re-request properties
              hub re-sends Hub Attached I/O on reconnect
```

No history catch-up needed (unlike TimeFlip) — hub state is fully reconstructed from `Hub Attached I/O` on every connect.

---

## 10. `LWPClient` Interface

```ts
constructor(peripheral: BlePeripheral)
async connect(): Promise<void>
async disconnect(): Promise<void>
async send(messageBytes: Buffer): Promise<void>   // write to characteristic
subscribeToNotifications(callback: (msg: Buffer) => void): void
on(event: 'disconnect', listener: () => void): this
```

---

## 11. `BoostController` Interface

```ts
constructor(client: LWPClient | MockLWPClient)
async start(): Promise<void>
async stop(): Promise<void>

// Upward events (EventEmitter)
on(event: 'hub_property', listener: (data: { property: number, value: number }) => void): this
on(event: 'port_attached', listener: (data: { portKey: string, ioTypeId: number, ioTypeName: string }) => void): this
on(event: 'port_detached', listener: (data: { portKey: string }) => void): this
on(event: 'port_value', listener: (data: { portKey: string, ioTypeId: number, capabilityId: string, value: number }) => void): this
on(event: 'button_pressed', listener: () => void): this
on(event: 'alert', listener: (data: { type: number, status: number }) => void): this
on(event: 'error', listener: (err: Error) => void): this

// Commands
setMotorSpeed(portKey: string, speed: number, maxPower?: number): Promise<void>
brakeMotor(portKey: string): Promise<void>
setLedColor(r: number, g: number, b: number): Promise<void>
requestBattery(): Promise<void>
```

---

## 12. `MessageParser` Interface

Stateless. Input: raw `Buffer`. Output: structured message object.

```ts
interface ParsedMessage {
  messageType: number
  hubId: number
  payload: Record<string, unknown>
}

MessageParser.parse(buffer: Buffer): ParsedMessage
// Throws on unknown/malformed message (caught by LWPClient)
```

---

## 13. `MessageBuilder` Interface

Stateless. Returns `Buffer` for each message type.

```ts
MessageBuilder.hubPropertyRequest(property: number, operation: number): Buffer
MessageBuilder.portInputFormatSetup(portId: number, mode: number, deltaInterval: number, notificationsEnabled: number): Buffer
MessageBuilder.startSpeed(portId: number, speed: number, maxPower?: number): Buffer
MessageBuilder.writeLedRgb(r: number, g: number, b: number): Buffer
MessageBuilder.disconnect(): Buffer
```

---

## 14. `IoTypeMap`

Maps IO Type ID → `{ name, capabilities: [capabilityId] }`.

```ts
interface IoTypeInfo {
  name: string
  capabilities: string[]
}

IoTypeMap.get(ioTypeId: number, portKey: string): IoTypeInfo | null
// Returns null for unknown IO types

IoTypeMap.isKnown(ioTypeId: number): boolean
```

---

## 15. `MockLWPClient`

```ts
class MockLWPClient extends EventEmitter {
  simulateNotification(messageBytes: Buffer): void
  simulateDisconnect(): void
  simulateReconnect(): void
  simulatePortAttach(portId: number, ioTypeId: number): void
  simulatePortDetach(portId: number): void
  getLastSentMessage(): Buffer | null
  getSentMessages(): Buffer[]
}
```

---

## 16. Testing Strategy

- **Unit tests**: `MessageParser`, `MessageBuilder`, `IoTypeMap`, `PortStateManager` — pure functions, no mocks needed, test with raw byte fixtures.
- **Integration tests**: `BoostController` against `MockLWPClient` — simulate attach/detach sequences, type swaps, reconnects, motor commands, verify correct messages sent and events emitted.
- **Adapter tests**: `HomeyDevice` against `MockHomeyDevice` — verify capability adds/sets/nulls triggered correctly by controller events.
- **E2E tests**: Pairing UI with Playwright — verify scan list renders, device selection works, error states display correctly.
- **Coverage target**: > 65% overall, > 80% for `MessageParser`, `MessageBuilder`, `IoTypeMap`, `PortStateManager`.

---

## 17. `constants.ts` Reference

```ts
// GATT
export const SERVICE_UUID        = '00001623-1212-efde-1623-785feabcd123'
export const CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123'

// Message Types
export const MSG_HUB_PROPERTIES  = 0x01
export const MSG_HUB_ACTIONS     = 0x02
export const MSG_HUB_ALERTS      = 0x03
export const MSG_HUB_ATTACHED_IO = 0x04
export const MSG_GENERIC_ERROR   = 0x05
export const MSG_PORT_INFO_REQ = 0x21
export const MSG_PORT_INPUT_FMT = 0x41
export const MSG_PORT_VALUE    = 0x45
export const MSG_PORT_OUTPUT  = 0x81
export const MSG_PORT_FEEDBACK = 0x82

// Hub Property IDs
export const PROP_ADV_NAME     = 0x01
export const PROP_BUTTON       = 0x02
export const PROP_FW_VERSION  = 0x03
export const PROP_BATTERY_VOLT = 0x06
export const PROP_BATTERY_TYPE = 0x07

// Hub Property Operations
export const OP_SET             = 0x01
export const OP_ENABLE_UPDATES = 0x02
export const OP_DISABLE_UPDATES = 0x03
export const OP_RESET          = 0x04
export const OP_REQUEST_UPDATE = 0x05
export const OP_UPDATE       = 0x06

// IO Type IDs
export const IO_MOTOR           = 0x0001
export const IO_RGB_LIGHT        = 0x0017
export const IO_EXT_TILT         = 0x0022
export const IO_MOTION          = 0x0023
export const IO_VISION          = 0x0025
export const IO_EXT_MOTOR_TACHO = 0x0026
export const IO_INT_MOTOR_TACHO  = 0x0027
export const IO_INT_TILT         = 0x0028

// Port IDs → Keys
export const PORT_MAP: Record<number, string> = {
  0x00: 'port_a',
  0x01: 'port_b',
  0x02: 'port_c',
  0x03: 'port_d',
  0x32: 'port_tilt',
  0x63: 'port_led',
}

// Alert Types
export const ALERT_LOW_VOLTAGE  = 0x01
export const ALERT_HIGH_CURRENT = 0x02
export const ALERT_LOW_SIGNAL = 0x03
export const ALERT_OVER_POWER = 0x04

// Startup/Completion
export const EXEC_IMMEDIATE_FEEDBACK = 0x11

// Defaults
export const DEFAULT_MAX_POWER = 80
export const DEFAULT_TILT_DELTA = 2
```

---

## 18. App Manifest Notes

```json
{
  "id": "com.unofficial.lego-boost",
  "name": { "en": "Unofficial LEGO Boost Homey Driver" },
  "permissions": ["homey:wireless:ble"]
}
```

Icon: 🐱‍💻 rendered as SVG in `/assets/icon.svg`.

---

## 19. References

- [LEGO Wireless Protocol 3.0 Official Docs](https://lego.github.io/lego-ble-wireless-protocol-docs/)
- [LEGO BLE Protocol GitHub](https://github.com/LEGO/lego-ble-wireless-protocol-docs)
- [BOOSTreveng — community reverse engineering](https://github.com/JorgePe/BOOSTreveng)
- [node-poweredup — JS reference implementation](https://github.com/nathankellenicki/node-poweredup)
- [pylgbst — Python reference implementation](https://github.com/undera/pylgbst)
- [Homey Apps SDK — BLE](https://apps.developer.homey.app/wireless/bluetooth)
