// All sound is synthesised with WebAudio: no audio files, no network, nothing
// to load. Short blips for coins and tools, a rising sting when the alarm climbs,
// a jingle for the getaway, and a quiet water-and-lantern pad underneath. The
// audio context is created on the first user gesture (browsers block sound
// before that); M toggles mute at any time.

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(frequency, seconds, type, volume, when, slideTo) {
    if (!ensure() || context === null || master === null) return;
    const start = context.currentTime + (when || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  /** The quiet night pad: two detuned sines breathing slowly, like water under the stalls. */
  function startPad() {
    if (!ensure() || context === null || master === null || padNodes !== null) return;
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(master);
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    const voices = [110, 164.81].map((frequency) => {
      const voice = context.createOscillator();
      voice.type = 'sine';
      voice.frequency.value = frequency;
      voice.connect(gain);
      voice.start();
      return voice;
    });
    lfo.start();
    padNodes = { gain, lfo, voices };
  }

  function stopPad() {
    if (padNodes === null) return;
    try {
      padNodes.voices.forEach((voice) => voice.stop());
      padNodes.lfo.stop();
    } catch {
      // Already stopped.
    }
    padNodes = null;
  }

  return {
    unlock() {
      if (ensure() && context !== null && context.state === 'suspended') context.resume();
      startPad();
    },
    toggleMute() {
      muted = !muted;
      if (master !== null && context !== null) master.gain.setTargetAtTime(muted ? 0 : 0.5, context.currentTime, 0.05);
      return muted;
    },
    isMuted() {
      return muted;
    },
    coin() {
      tone(1320, 0.09, 'sine', 0.16);
      tone(1760, 0.12, 'sine', 0.12, 0.06);
    },
    jade() {
      tone(880, 0.12, 'triangle', 0.2);
      tone(1174.66, 0.14, 'triangle', 0.18, 0.08);
      tone(1567.98, 0.2, 'triangle', 0.14, 0.16);
    },
    koi() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        tone(frequency, 0.3, 'triangle', 0.2, index * 0.09);
      });
    },
    dash() {
      tone(420, 0.14, 'sine', 0.12, 0, 180);
    },
    smoke() {
      tone(300, 0.4, 'sine', 0.1, 0, 90);
    },
    cracker() {
      tone(1800, 0.06, 'square', 0.1);
      tone(900, 0.1, 'square', 0.12, 0.07);
    },
    suspicious() {
      tone(392, 0.25, 'triangle', 0.16, 0, 523.25);
    },
    alarm() {
      tone(220, 0.5, 'sawtooth', 0.14, 0, 440);
      tone(233, 0.5, 'sawtooth', 0.1, 0.12, 466);
    },
    caught() {
      tone(196, 0.7, 'sawtooth', 0.18, 0, 98);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => {
        tone(frequency, 0.35, 'triangle', 0.2, index * 0.11);
      });
    },
    dawn() {
      tone(330, 0.9, 'sine', 0.14, 0, 165);
    },
    click() {
      tone(660, 0.05, 'sine', 0.1);
    },
    stopPad,
  };
}
