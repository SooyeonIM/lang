// Web Audio API synthesizer for retro/modern tactile sounds.
// This is server-safe and lazy-initialized on first user interaction to bypass browser autoplay constraints.

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: "correct" | "incorrect" | "click" | "victory" | "gameover") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        // High-frequency organic click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
      case "correct": {
        // Double sweet note arpeggio (C5 -> E5)
        const notes = [523.25, 659.25]; // C5, E5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);

          const noteStart = now + idx * 0.09;
          osc.frequency.setValueAtTime(freq, noteStart);
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.2);

          osc.start(noteStart);
          osc.stop(noteStart + 0.22);
        });
        break;
      }
      case "incorrect": {
        // Disappointing retro buzz (G#2 -> F2)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.25);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }
      case "victory": {
        // Joyful arpeggio major triad (C4 -> E4 -> G4 -> C5)
        const pentatonic = [261.63, 329.63, 392.00, 523.25];
        pentatonic.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);

          const noteStart = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, noteStart);
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.35);

          osc.start(noteStart);
          osc.stop(noteStart + 0.4);
        });
        break;
      }
      case "gameover": {
        // Deep sad descending buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        // Low pass filter to make it warmer
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(300, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(55, now + 0.6);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.62);
        break;
      }
    }
  } catch (e) {
    // Fail silently if browser doesn't support or blocks Web Audio.
    console.warn("AudioContext failed to play:", e);
  }
}
