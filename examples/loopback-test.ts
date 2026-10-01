import { CP2102NGPIO } from '../src/index';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Loopback test: wire RTS -> DCD (or DTR -> DCD), then run.
 * Usage: npx ts-node examples/loopback-test.ts /dev/cu.usbserial-0001 [rts|dtr]
 */
async function main() {
  const path = process.argv[2] || '/dev/cu.usbserial-0001';
  const pin = (process.argv[3] || 'rts').toLowerCase();
  const gpio = new CP2102NGPIO(path);

  await gpio.open();
  console.log(`Testing ${pin.toUpperCase()} -> DCD on ${path}`);

  let pass = 0, fail = 0;
  for (const v of [true, false, true, false]) {
    if (pin === 'rts') await gpio.setRTS(v);
    else await gpio.setDTR(v);
    await sleep(500);
    const dcd = await gpio.getDCD();
    const ok = dcd === v;
    console.log(`  set=${v} dcd=${dcd} ${ok ? 'PASS' : 'FAIL'}`);
    ok ? pass++ : fail++;
  }
  await gpio.close();
  console.log(`Done: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
