import { SerialPort } from 'serialport';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Use a CP2102N USB-serial adapter's modem pins as GPIO.
 *
 * Outputs: RTS, DTR
 * Inputs:  CTS, DSR, DCD, RI
 *
 * Active-low signaling is abstracted: pass logical true/false and the
 * library handles the electrical inversion. For example, setRTS(true)
 * drives the RTS pin to 0V (asserted).
 *
 * Hardware quirk: after opening the port, the CP2102N driver needs ~1s
 * before GPIO control transfers work. The first setRTS/setDTR call is
 * silently ignored if sent too early. This class does a 1s init delay
 * plus a dummy toggle to work around it.
 *
 * Tested on: DSD TECH SH-U09B3 (CP2102N, USB-C)
 */
export class CP2102NGPIO {
  private port: SerialPort | null = null;
  private path: string;
  private baudRate: number;

  constructor(path: string, baudRate = 115200) {
    this.path = path;
    this.baudRate = baudRate;
  }

  /** Open the port and initialize GPIO (handles the init-delay quirk). */
  async open(): Promise<void> {
    this.port = new SerialPort({ path: this.path, baudRate: this.baudRate });
    await new Promise<void>((resolve, reject) => {
      this.port!.on('open', () => resolve());
      this.port!.on('error', (e) => reject(e));
    });
    // Quirk workaround: driver needs time before GPIO works.
    await sleep(1000);
    // Dummy toggle to wake up GPIO control.
    await this.setRTSRaw(true);
    await sleep(300);
    await this.setRTSRaw(false);
    await sleep(300);
  }

  private async setRTSRaw(v: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port!.set({ rts: v }, (err) => err ? reject(err) : resolve());
    });
  }

  private async setDTRRaw(v: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port!.set({ dtr: v }, (err) => err ? reject(err) : resolve());
    });
  }

  /** Drive RTS pin. true = 0V (asserted), false = 3.3V (idle). */
  async setRTS(v: boolean): Promise<void> {
    // serialport's set() takes logical values; CP2102N is active-low
    // so we pass through directly (true = asserted = 0V).
    await this.setRTSRaw(v);
  }

  /** Drive DTR pin. true = 0V (asserted), false = 3.3V (idle). */
  async setDTR(v: boolean): Promise<void> {
    await this.setDTRRaw(v);
  }

  private async getSignals(): Promise<{ cts: boolean; dsr: boolean; dcd: boolean; ri: boolean }> {
    return new Promise((resolve, reject) => {
      this.port!.get((err, sigs: any) => {
        if (err) return reject(err);
        resolve({ cts: !!sigs.cts, dsr: !!sigs.dsr, dcd: !!sigs.dcd, ri: !!sigs.ri });
      });
    });
  }

  /** Read CTS input. true = pin at 0V (asserted). */
  async getCTS(): Promise<boolean> { return (await this.getSignals()).cts; }
  /** Read DSR input. true = pin at 0V (asserted). */
  async getDSR(): Promise<boolean> { return (await this.getSignals()).dsr; }
  /** Read DCD input. true = pin at 0V (asserted). */
  async getDCD(): Promise<boolean> { return (await this.getSignals()).dcd; }
  /** Read RI input. true = pin at 0V (asserted). */
  async getRI(): Promise<boolean> { return (await this.getSignals()).ri; }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.port || !this.port.isOpen) return resolve();
      this.port.close(() => resolve());
    });
  }
}
