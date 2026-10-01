import { CP2102NGPIO } from '../src/index';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Drive Jetson Orin Nano FC_REC pin via RTS.
 * Wiring: SH-U09B3 RTS -> J14 pin 9 (FC REC), GND -> J14 pin 10 (GND).
 * setRTS(true) pulls REC to GND (0V), triggering recovery on next boot.
 *
 * Usage: npx ts-node examples/orin-rec-control.ts /dev/cu.usbserial-0001 assert|release
 */
async function main() {
  const path = process.argv[2] || '/dev/cu.usbserial-0001';
  const action = (process.argv[3] || 'assert').toLowerCase();
  const gpio = new CP2102NGPIO(path);

  await gpio.open();
  if (action === 'assert') {
    await gpio.setRTS(true);
    console.log('RTS asserted: FC_REC pulled to GND. Power-cycle the Orin now.');
    // Hold for 5 minutes so the user can cycle power.
    await sleep(300_000);
  } else {
    await gpio.setRTS(false);
    console.log('RTS released: FC_REC floating/high.');
  }
  await gpio.close();
}

main().catch(e => { console.error(e); process.exit(1); });
