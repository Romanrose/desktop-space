/**
 * Game-style sound effects using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  delay = 0
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Audio not available — silently ignore
  }
}

/** Soft UI click */
export function playClick() {
  playTone(800, 0.06, "sine", 0.08);
}

/** Positive interaction (chat, menu open) */
export function playPositive() {
  playTone(523, 0.12, "sine", 0.1);
  playTone(659, 0.12, "sine", 0.1, 0.08);
  playTone(784, 0.18, "sine", 0.1, 0.16);
}

/** Game reaction: target lit up */
export function playTargetLit() {
  playTone(880, 0.08, "sine", 0.12);
  playTone(1100, 0.1, "sine", 0.1, 0.04);
}

/** Game reaction: hit! */
export function playHit() {
  playTone(660, 0.06, "square", 0.1);
  playTone(880, 0.08, "square", 0.08, 0.04);
  playTone(1100, 0.12, "square", 0.06, 0.1);
}

/** Miss / fail sound */
export function playMiss() {
  playTone(300, 0.15, "sawtooth", 0.06);
  playTone(200, 0.2, "sawtooth", 0.05, 0.1);
}

/** Achievement / milestone unlock */
export function playAchievement() {
  playTone(523, 0.15, "sine", 0.12);
  playTone(659, 0.15, "sine", 0.1, 0.1);
  playTone(784, 0.15, "sine", 0.1, 0.2);
  playTone(1047, 0.3, "sine", 0.12, 0.3);
}

/** Ambient space hum (very subtle, long drone) */
export function playAmbientStart() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 55; // very low hum
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 8);
  } catch {
    // ignore
  }
}

/** Initialize audio context (must be called from user gesture) */
export function initAudio() {
  try {
    getCtx().resume();
  } catch {
    // ignore
  }
}
