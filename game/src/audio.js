// DOCKLIGHT — every sound is synthesised with WebAudio: no audio files,
// no network. Footsteps pan and fade with distance, so you can hear
// where a guard is; the alert sting, pickup blip and win jingle are
// short oscillator phrases.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    enabled: true,
  };

  // Browsers only let audio start after a gesture, so this is called on
  // the first key press or click.
  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audio.ctx = new Ctor();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
  };

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime + (when || 0);
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, pan, lowpass) {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const gain = audio.ctx.createGain();
    gain.gain.value = vol;
    const panner = audio.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan || 0));
    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(audio.master);
    src.start(t0);
  }

  // A footstep. `pan` is -1 (far left) to 1 (far right) from the
  // player's view, `vol` fades with distance, `sneak` makes it soft.
  audio.footstep = function footstep(pan, vol, sneak) {
    if (!audio.ctx) return;
    noiseBurst(sneak ? 0.05 : 0.07, vol * (sneak ? 0.35 : 1), pan, sneak ? 500 : 800);
  };

  // The two-note sting when a guard goes to "!".
  audio.alertSting = function alertSting() {
    tone(392, 0.16, 'square', 0.12, 0);
    tone(311, 0.26, 'square', 0.12, 0.14);
  };

  audio.pickup = function pickup() {
    tone(660, 0.09, 'sine', 0.16, 0);
    tone(990, 0.14, 'sine', 0.16, 0.08);
  };

  audio.caught = function caught() {
    tone(220, 0.5, 'sawtooth', 0.16, 0, 55);
  };

  audio.levelClear = function levelClear() {
    tone(523, 0.12, 'sine', 0.16, 0);
    tone(659, 0.12, 'sine', 0.16, 0.11);
    tone(784, 0.22, 'sine', 0.16, 0.22);
  };

  audio.win = function win() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => tone(n, 0.18, 'sine', 0.15, i * 0.13));
  };

  audio.click = function click() {
    tone(880, 0.05, 'sine', 0.1, 0);
  };

  return audio;
}
