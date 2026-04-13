# CLAUDE.md — Development Rules

This file contains standing instructions for how to work on this codebase.  
Read this before making any changes.

---

## TODO.md Rules

- **Keep TODO.md lean.** Each item should be one sentence describing *what* to build and *what to test*. Do not repeat protocol details, data shapes, or interface signatures — those live in SPEC.md. Reference SPEC sections by number (e.g. "per SPEC §4").
- **Reference, don't duplicate.** If a TODO item needs to explain what a method does, that is a sign the SPEC is incomplete — update the SPEC instead, then reference it.
- **Preserve the group structure.** TODO items are arranged in ordered Groups. Groups must be completed in order (each group depends on the previous). Within a group, items are independent and **can be implemented in parallel** — do not introduce hidden dependencies between items in the same group.
- **Mark items done.** When an item is complete, change `- [ ]` to `- [x]`. Do not delete completed items.
- **Add items at the bottom of the appropriate group.** New work discovered during implementation should be added as new items, not retrofitted into completed items.

---

## Testing Rules

### Coverage
- Overall coverage target: **> 65%**.
- Coverage target for pure logic modules (`MessageParser`, `MessageBuilder`, `IoTypeMap`, `PortStateManager`): **> 80%**.
- Do not merge a group's work if its coverage target is not met.
- Run coverage with `npm run coverage` before considering a group done.

### Every step must be testable
- Each TODO item must produce at least one test file, or add tests to an existing one.
- If a module cannot be tested without a real BLE device or a real Homey, it is not correctly structured — fix the architecture first.

### Mocking
- **BLE layer**: use `MockLWPClient` (see SPEC §15) to simulate all BLE interactions. Never write tests that require a real BLE peripheral.
- **Homey SDK**: use `MockHomeyDevice` to simulate all Homey SDK interactions. Never write tests that require a running Homey instance.
- **Keep mocks honest**: mocks must implement the same interface as the real thing. If the real interface changes, update the mock immediately or tests become meaningless.
- **Mock state is test state**: use `mock.getLastSentMessage()` / `mock.getSentMessages()` to assert on outgoing BLE messages. Do not inspect internal controller state directly.

### Web / pairing UI
- Any HTML pairing views must be tested with **Playwright** (`test/e2e/`).
- Playwright tests must run headless in CI.
- Cover at minimum: happy path (device found and selected), empty scan result, connection error display.
- Do not use Playwright for non-UI logic — unit tests are faster and more precise.

### Test file naming
- Unit tests: `test/<ModuleName>.test.ts`
- E2E tests: `test/e2e/<feature>.spec.ts`
- Mocks: `test/mocks/<MockName>.ts`

### Test style
- Prefer explicit byte assertions for protocol tests: `expect(msg[2]).toBe(0x41)` over snapshot tests.
- Use descriptive test names: `'emits port_detached and nulls capability values when IO detaches'`.
- Group related tests with `describe` blocks matching the method or behaviour under test.

---

## Architecture Rules

- **TypeScript required**. All source files must be `.ts`. No `.js` files permitted.
- **Never import Homey SDK in `lib/`**. If you find yourself writing `require('homey')` outside of `drivers/`, stop and restructure.
- **Never import BLE primitives in `lib/` except `LWPClient.ts`**. `BoostController` and below must work with `MockLWPClient` unchanged.
- **`device.ts` must remain thin**. If business logic is creeping into `device.ts`, move it to `BoostController`.
- **`constants.ts` is the single source of truth** for all magic numbers. No hardcoded UUIDs, message type bytes, or IO type IDs outside of `constants.ts` and tests.

---

## SPEC.md Rules

- SPEC.md is the source of truth for interfaces, protocol details, data shapes, and capability mappings.
- If implementation reveals the SPEC is wrong or incomplete, **update SPEC.md first**, then implement.
- Do not silently deviate from SPEC — if a spec decision turns out to be impractical, update the spec and note the reason.
