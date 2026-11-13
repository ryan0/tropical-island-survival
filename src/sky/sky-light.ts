import { Color, Vector3 } from 'three';
import { smoothstep } from '../core/maths';
import { skyConfig } from './sky-config';

export type TimeOfDay = 'night' | 'dawn' | 'sunset' | 'morning' | 'golden' | 'day';

/** What the rest of the scene is told about the light, renewed by each `update`. */
export interface LightOfDay {
  /** 0 at night to 1 in full day. */
  daylight: number;
  /** 0 by day to 1 at night. */
  night: number;
  /** The height the sun is drawn at. */
  sunElevation: number;
  /** Red, green, blue. */
  sunColour: [number, number, number];
  timeOfDay: TimeOfDay;
}

/** The uniforms the sky owns. Every shader that wants the light of the moment shares them. */
export interface SkyLightUniforms {
  /** The unit vector towards the sun. */
  uSunDir: { value: Vector3 };
  uSunCol: { value: Color };
  /** The sky's colour overhead and at the horizon. */
  uTop: { value: Color };
  uHor: { value: Color };
  uNight: { value: number };
  uDay: { value: number };
  /** The colours of cloud in the sun and in shade. */
  uCloudSun: { value: Color };
  uCloudShd: { value: Color };
}

export interface SkyLight {
  uniforms: SkyLightUniforms;
  light: LightOfDay;
  update(sunHeight: number, isMorning: boolean): void;
}

type Rgb = readonly [number, number, number];

const { day, light: lightConfig, colours } = skyConfig;

function blend(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/** `from` blended towards `to`, and the result towards `last`, written into `colour`. */
function setBlendOfThree(
  colour: Color,
  from: Rgb,
  to: Rgb,
  share: number,
  last: Rgb,
  lastShare: number,
): void {
  colour.setRGB(
    blend(blend(from[0], to[0], share), last[0], lastShare),
    blend(blend(from[1], to[1], share), last[1], lastShare),
    blend(blend(from[2], to[2], share), last[2], lastShare),
  );
}

function nameOf(sunHeight: number, isMorning: boolean): TimeOfDay {
  if (sunHeight < day.belowIsNight) return 'night';
  if (sunHeight < day.belowIsDawnOrSunset) return isMorning ? 'dawn' : 'sunset';
  if (sunHeight < day.belowIsMorningOrGolden) return isMorning ? 'morning' : 'golden';
  return 'day';
}

/** Turns the sun's height into the light of the moment: where the sun stands and every colour. */
export function createSkyLight(): SkyLight {
  const uniforms: SkyLightUniforms = {
    uSunDir: { value: new Vector3(0, 1, 0) },
    uSunCol: { value: new Color() },
    uTop: { value: new Color() },
    uHor: { value: new Color() },
    uNight: { value: 0 },
    uDay: { value: 1 },
    uCloudSun: { value: new Color() },
    uCloudShd: { value: new Color() },
  };
  const light: LightOfDay = {
    daylight: 1,
    night: 0,
    sunElevation: 0.6,
    sunColour: [1, 1, 1],
    timeOfDay: 'day',
  };
  const cloudInSun = new Color();

  return {
    uniforms,
    light,

    update(sunHeight, isMorning) {
      const daylight = smoothstep(0, lightConfig.fullDaylightAt, sunHeight);
      const night = 1 - smoothstep(lightConfig.nightFrom, lightConfig.nightTo, sunHeight);
      const sunShows = 1 - night;

      const { overhead, horizon, sun, cloudInShade } = colours;
      setBlendOfThree(
        uniforms.uTop.value,
        overhead.lowSun,
        overhead.day,
        Math.pow(daylight, colours.overheadEagerness),
        overhead.night,
        night,
      );
      setBlendOfThree(
        uniforms.uHor.value,
        horizon.lowSun,
        horizon.day,
        daylight,
        horizon.night,
        night,
      );
      const sunHigh = Math.pow(daylight, colours.sunGoldenness);
      light.sunColour[0] = blend(sun.low[0], sun.high[0], sunHigh);
      light.sunColour[1] = blend(sun.low[1], sun.high[1], sunHigh);
      light.sunColour[2] = blend(sun.low[2], sun.high[2], sunHigh);
      uniforms.uSunCol.value.setRGB(light.sunColour[0], light.sunColour[1], light.sunColour[2]);

      // The sun comes up on one side of its noon bearing and goes down on the other.
      const elevation = -lightConfig.drawnLower + sunHeight;
      const swing = isMorning ? lightConfig.bearingSwing : -lightConfig.bearingSwing;
      const bearing = lightConfig.noonBearing + swing * (1 - daylight);
      uniforms.uSunDir.value
        .set(
          Math.sin(bearing) * Math.cos(elevation),
          Math.sin(elevation),
          Math.cos(bearing) * Math.cos(elevation),
        )
        .normalize();

      const { sunset, golden, day: whiteDay } = colours.cloudInSun;
      const moonlit = colours.cloudInMoonlight;
      setBlendOfThree(
        cloudInSun,
        sunset,
        golden,
        smoothstep(0, 0.5, daylight),
        whiteDay,
        smoothstep(0.45, 1, daylight),
      );
      uniforms.uCloudSun.value.setRGB(
        cloudInSun.r * sunShows + moonlit[0] * night,
        cloudInSun.g * sunShows + moonlit[1] * night,
        cloudInSun.b * sunShows + moonlit[2] * night,
      );
      setBlendOfThree(
        uniforms.uCloudShd.value,
        cloudInShade.lowSun,
        cloudInShade.day,
        daylight,
        cloudInShade.night,
        night,
      );
      uniforms.uNight.value = night;
      uniforms.uDay.value = daylight;

      light.daylight = daylight;
      light.night = night;
      light.sunElevation = elevation;
      light.timeOfDay = nameOf(sunHeight, isMorning);
    },
  };
}
