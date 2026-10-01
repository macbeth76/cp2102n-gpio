# cp2102n-gpio

Use a CP2102N USB-serial adapter's modem pins as GPIO.

## Pins

| Pin | Direction | Notes |
|-----|-----------|-------|
| RTS | Output | `setRTS(true)` drives 0V (asserted) |
| DTR | Output | `setDTR(true)` drives 0V (asserted) |
| CTS | Input | `getCTS()` |
| DSR | Input | `getDSR()` |
| DCD | Input | `getDCD()` |
| RI  | Input | `getRI()` |

Active-low signaling is abstracted: logical `true` = asserted = 0V on the pin.

## Hardware quirk

After opening the port, the CP2102N driver needs ~1s before GPIO control
transfers work. The first `setRTS`/`setDTR` is silently ignored if sent too
early. `open()` handles this with a 1s delay plus a dummy toggle.

## Usage

```typescript
import { CP2102NGPIO } from 'cp2102n-gpio';

const gpio = new CP2102NGPIO('/dev/cu.usbserial-0001');
await gpio.open();

await gpio.setRTS(true);   // RTS -> 0V
const dcd = await gpio.getDCD();

await gpio.close();
```

## Examples

```bash
# Loopback test (wire RTS -> DCD first)
npx ts-node examples/loopback-test.ts /dev/cu.usbserial-0001 rts

# Orin Nano recovery control (wire RTS -> J14 pin 9, GND -> pin 10)
npx ts-node examples/orin-rec-control.ts /dev/cu.usbserial-0001 assert
```

## Tested on

- DSD TECH SH-U09B3 (CP2102N, USB-C) — all 6 modem pins verified 2026-10-01
