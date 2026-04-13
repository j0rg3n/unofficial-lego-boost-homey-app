# TODO.md — Unofficial LEGO Boost Homey Driver

See SPEC.md for full details on all interfaces, protocols, and data shapes.  
See CLAUDE.md for rules governing how this TODO should be maintained.

---

## Group 1 — Project Scaffolding
*No dependencies. All items parallelisable.*

- [x] **1.1** Initialise Homey app with `homey app create`: set id `com.unofficial.lego-boost`, name, BLE permission, coding-cat icon SVG. Verify `homey app validate` passes.
- [x] **1.2** Set up test runner (Jest or `node --test`), coverage reporter, and `npm test` script. Add `.github/workflows/test.yml` running tests on push.
- [x] **1.3** Create `lib/constants.ts` with all UUIDs, message type bytes, IO type IDs, port map, and defaults from SPEC §17. Write tests asserting key values are defined and port map is complete.
- [x] **1.4** Create `test/mocks/MockLWPClient.ts` and `test/mocks/MockHomeyDevice.ts` per SPEC §15 and §2.2. Write tests for the mocks themselves (simulate methods work, message capture works).

---

## Group 2 — Pure Protocol Layer
*Depends on Group 1. Items 2.1–2.3 are parallelisable with each other.*

- [x] **2.1** Implement `lib/MessageParser.ts` per SPEC §12. Cover: common header parsing, length encoding (1-byte and 2-byte), all used message types (§3.3), unknown type handling. Tests with raw byte fixtures for each message type. Target > 80% coverage.
- [x] **2.2** Implement `lib/MessageBuilder.ts` per SPEC §13. Cover: all builder methods, correct length prefix, little-endian encoding, boundary values (speed -100/0/100, max power 0/100). Tests assert exact byte output. Target > 80% coverage.
- [x] **2.3** Implement `lib/IoTypeMap.ts` per SPEC §14. Cover: all IO types in SPEC §3.6, port key substitution in capability IDs, unknown type returns null, `isKnown()`. Tests for every IO type ID. Target > 80% coverage.

---

## Group 3 — Port State & BLE Client
*Depends on Group 2. Items 3.1 and 3.2 are parallelisable.*

- [x] **3.1** Implement `lib/PortStateManager.ts` per SPEC §4. Cover: attach new type (capabilities added), attach different type on same port (old nulled, new activated), detach (values nulled, activeIoType cleared), reset (all dynamic capabilities removed, store cleared), store persistence shape matches SPEC §4.2. Tests use MockHomeyDevice. Target > 80% coverage.
- [x] **3.2** Implement `lib/LWPClient.ts` per SPEC §10. Cover: connect/disconnect, send (writes to characteristic), notification subscription (callback invoked on notify), disconnect event forwarded, reconnect after disconnect. Tests use MockLWPClient as reference for interface compliance. Unit-test message round-trip with MessageParser/Builder.

---

## Group 4 — Controller
*Depends on Group 3.*

- [x] **4.1** Implement `lib/BoostController.ts` per SPEC §11. Cover using MockLWPClient:
  - Hub property updates (battery, button) → correct events emitted
  - Port attach sequence → `port_attached` event, correct `portInputFormatSetup` sent
  - Port detach → `port_detached` event
  - IO type swap on same port → old capabilities nulled, new activated
  - Port value notifications → `port_value` events with correct capability IDs
  - Motor commands → correct `startSpeed` bytes sent
  - LED command → correct `writeLedRgb` bytes sent
  - Alert subscription and forwarding
  - Reconnect → re-subscription and re-property-request
   
   Target > 70% coverage.

---

## Group 5 — Homey Adapter
*Depends on Group 4. Items 5.1 and 5.2 are parallelisable.*

- [x] **5.1** Implement `drivers/boost/device.ts` (HomeyDevice) per SPEC §2.2. Wire controller events to capability sets, Flow trigger fires, settings reads. Tests use MockHomeyDevice + MockLWPClient. Verify: capability values set correctly, null on detach, `addCapability` called exactly once per new IO type, Flow triggers fire on correct events.
- [x] **5.2** Implement `drivers/boost/driver.ts` (pairing) per SPEC §8. BLE scan filtered by service UUID, device list returned, connect + handshake on selection. Tests mock `homey.ble`.

---

## Group 6 — Flow Cards & Settings
*Depends on Group 5. Items parallelisable.*

- [x] **6.1** Define and register all Flow trigger cards from SPEC §6.1. Add run listeners. Tests verify cards registered and listeners return correct values.
- [x] **6.2** Define and register all Flow condition cards from SPEC §6.2. Tests verify conditions evaluate correctly against mock device state.
- [x] **6.3** Define and register all Flow action cards from SPEC §6.3. Tests verify action listeners invoke correct controller methods with correct args.
- [x] **6.4** Implement device settings schema from SPEC §7. Implement `onSettings` handler that pushes changed values to controller. Implement `reset_port_history` button handler. Tests verify settings changes propagate.

---

## Group 7 — E2E & Polish
*Depends on Group 6.*

- [x] **7.1** Write Playwright tests (`test/e2e/pairing.spec.ts`) for pairing UI: scan list renders devices, selecting a device proceeds, empty scan shows appropriate message, error state during connect is displayed.
- [x] **7.2** Full integration smoke test: MockLWPClient simulates complete session (connect → attach sequence → sensor values → motor command → detach → reconnect). Assert final Homey device state is correct end-to-end.
- [x] **7.3** Verify overall coverage >= 65%. Add targeted tests for any gaps. Run `homey app validate`. Write README with installation instructions and pairing steps.
