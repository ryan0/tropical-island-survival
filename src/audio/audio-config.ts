export const audioConfig = {
  /** How loud everything is once the sound has faded in. */
  loudness: 0.8,
  /** Seconds the sound takes to fade in or out. */
  fadeSeconds: 0.6,

  // The surf is noise with its high part filtered away, louder the more the waves are breaking.
  surf: {
    /** Seconds of noise, played round and round. */
    noiseSeconds: 3,
    /** How much of each sample is new; the rest is the sample before. Less is a deeper rumble. */
    noiseChange: 0.03,
    noiseLoudness: 6,
    /** The noise passes below this many hertz. */
    filterHertz: 900,
    /** A slow swell opens and closes the filter and raises and lowers the loudness together. */
    swellRadiansPerSecond: 0.7,
    swellInFilterHertz: 350,
    swellInLoudness: 0.25,
    /** Loudness with nothing breaking, and what is added when everything near the camera is. */
    loudnessWhenCalm: 0.22,
    loudnessOfBreaking: 0.55,
    /** Until the first frame says how much is breaking. */
    loudnessAtStart: 0.35,
  },

  // The crickets are one high tone, switched on and off quickly to chirp, that comes and goes.
  crickets: {
    toneHertz: 4400,
    chirpsPerSecond: 17,
    /** How often the chirping swells and fades, and by how much of its level. */
    swellsPerSecond: 0.9,
    swellDepth: 0.5,
    /** The level the chirps switch around, and how far to each side: together, off to full. */
    chirpLevel: 0.5,
    chirpDepth: 0.5,
    loudnessAtNight: 0.035,
  },
};
