import { audioConfig } from './audio-config';

export type SoundState = 'on' | 'off' | 'unavailable';

export interface Audio {
  /** Switches the sound on or off. The first call builds it: a browser allows that only in a tap. */
  toggle(): SoundState;
  /** `breaking` is how much surf is breaking near the camera, from 0 to 1. */
  setSurfBreaking(breaking: number): void;
  /** `night` is 0 by day and 1 at night. */
  update(night: number): void;
}

interface Sound {
  context: AudioContext;
  /** Everything passes through this on its way out; it fades the sound in and out. */
  master: GainNode;
  surf: GainNode;
  crickets: GainNode;
}

// Safari before 14.1 knows the audio context only by its old name, and a browser may have none.
interface BrowserAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function createContext(): AudioContext {
  const browser: BrowserAudio = window;
  const Context = browser.AudioContext ?? browser.webkitAudioContext;
  if (Context === undefined) throw new Error('this browser has no audio');
  return new Context();
}

function createNoise(context: AudioContext): AudioBuffer {
  const { noiseSeconds, noiseChange, noiseLoudness } = audioConfig.surf;
  const length = context.sampleRate * noiseSeconds;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = value * (1 - noiseChange) + (Math.random() * 2 - 1) * noiseChange;
    samples[i] = value * noiseLoudness;
  }
  return buffer;
}

/** Returns the gain that sets how loud the surf is. */
function createSurf(context: AudioContext, output: AudioNode): GainNode {
  const config = audioConfig.surf;
  const noise = context.createBufferSource();
  noise.buffer = createNoise(context);
  noise.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = config.filterHertz;
  const loudness = context.createGain();
  loudness.gain.value = config.loudnessAtStart;

  const swell = context.createOscillator();
  swell.frequency.value = config.swellRadiansPerSecond / (2 * Math.PI);
  const swellInLoudness = context.createGain();
  swellInLoudness.gain.value = config.swellInLoudness;
  swell.connect(swellInLoudness);
  swellInLoudness.connect(loudness.gain);
  const swellInFilter = context.createGain();
  swellInFilter.gain.value = config.swellInFilterHertz;
  swell.connect(swellInFilter);
  swellInFilter.connect(filter.frequency);

  noise.connect(filter);
  filter.connect(loudness);
  loudness.connect(output);
  noise.start();
  swell.start();
  return loudness;
}

/** Returns the gain that sets how loud the crickets are; they start silent. */
function createCrickets(context: AudioContext, output: AudioNode): GainNode {
  const config = audioConfig.crickets;
  const tone = context.createOscillator();
  tone.frequency.value = config.toneHertz;
  const chirping = context.createGain();
  chirping.gain.value = config.chirpLevel;

  const chirp = context.createOscillator();
  chirp.type = 'square';
  chirp.frequency.value = config.chirpsPerSecond;
  const chirpDepth = context.createGain();
  chirpDepth.gain.value = config.chirpDepth;
  chirp.connect(chirpDepth);
  chirpDepth.connect(chirping.gain);

  const swell = context.createOscillator();
  swell.frequency.value = config.swellsPerSecond;
  const swellDepth = context.createGain();
  swellDepth.gain.value = config.swellDepth;
  swell.connect(swellDepth);
  swellDepth.connect(chirping.gain);

  const loudness = context.createGain();
  loudness.gain.value = 0;
  tone.connect(chirping);
  chirping.connect(loudness);
  loudness.connect(output);
  tone.start();
  chirp.start();
  swell.start();
  return loudness;
}

function createSound(): Sound {
  const context = createContext();
  const master = context.createGain();
  master.gain.value = 0;
  const surf = createSurf(context, master);
  const crickets = createCrickets(context, master);
  master.connect(context.destination);
  return { context, master, surf, crickets };
}

export function createAudio(): Audio {
  let sound: Sound | null = null;
  let isOn = false;

  return {
    toggle() {
      try {
        sound ??= createSound();
        isOn = !isOn;
        void sound.context.resume();
        sound.master.gain.linearRampToValueAtTime(
          isOn ? audioConfig.loudness : 0,
          sound.context.currentTime + audioConfig.fadeSeconds,
        );
        return isOn ? 'on' : 'off';
      } catch {
        return 'unavailable';
      }
    },

    setSurfBreaking(breaking) {
      if (sound === null) return;

      const { loudnessWhenCalm, loudnessOfBreaking } = audioConfig.surf;
      sound.surf.gain.value = loudnessWhenCalm + loudnessOfBreaking * breaking;
    },

    update(night) {
      if (sound !== null) sound.crickets.gain.value = night * audioConfig.crickets.loudnessAtNight;
    },
  };
}
