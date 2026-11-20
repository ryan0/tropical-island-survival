import { Color, Vector3 } from 'three';
import { mix, smoothstep, type Rgb } from '../core/maths';
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
  uSunDirection: { value: Vector3 };
  uSunColour: { value: Color };
  /** The unit vector towards the moon. */
  uMoonDirection: { value: Vector3 };
  /** The sky's colour overhead and at the horizon. */
  uSkyOverhead: { value: Color };
  uSkyHorizon: { value: Color };
  uNight: { value: number };
  uDaylight: { value: number };
  /** The colours of cloud in the sun and in shade. */
  uCloudInSun: { value: Color };
  uCloudInShade: { value: Color };
}

export interface SkyLight {
  uniforms: SkyLightUniforms;
  light: LightOfDay;
  /** The sun's height and the moon's, in radians above the horizon, and whether each is still climbing. */
  update(sunHeight: number, isMorning: boolean, moonHeight: number, isMoonRising: boolean): void;
}

const { day, light: lightConfig, colours } = skyConfig;

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
    mix(mix(from[0], to[0], share), last[0], lastShare),
    mix(mix(from[1], to[1], share), last[1], lastShare),
    mix(mix(from[2], to[2], share), last[2], lastShare),
  );
}

function nameOf(sunHeight: number, isMorning: boolean): TimeOfDay {
  if (sunHeight < day.belowIsNight) return 'night';
  if (sunHeight < day.belowIsDawnOrSunset) return isMorning ? 'dawn' : 'sunset';
  if (sunHeight < day.belowIsMorningOrGolden) return isMorning ? 'morning' : 'golden';
  return 'day';
}

/**
 * Where the sun or the moon stands at a height above the horizon, written into `direction`. Each comes
 * up on one side of its highest bearing and goes down on the other, and is drawn a little lower than
 * it stands.
 */
function setPlaceInSky(direction: Vector3, height: number, isRising: boolean): void {
  const elevation = height - lightConfig.drawnLower;
  const swing = isRising ? lightConfig.bearingSwing : -lightConfig.bearingSwing;
  const lowness = 1 - smoothstep(0, lightConfig.fullDaylightAt, height);
  const bearing = lightConfig.noonBearing + swing * lowness;
  direction
    .set(
      Math.sin(bearing) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(bearing) * Math.cos(elevation),
    )
    .normalize();
}

/** Turns the sun's height into the light of the moment: where the sun and moon stand and every colour. */
export function createSkyLight(): SkyLight {
  const uniforms: SkyLightUniforms = {
    uSunDirection: { value: new Vector3(0, 1, 0) },
    uSunColour: { value: new Color() },
    uMoonDirection: { value: new Vector3(0, 1, 0) },
    uSkyOverhead: { value: new Color() },
    uSkyHorizon: { value: new Color() },
    uNight: { value: 0 },
    uDaylight: { value: 1 },
    uCloudInSun: { value: new Color() },
    uCloudInShade: { value: new Color() },
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

    update(sunHeight, isMorning, moonHeight, isMoonRising) {
      const daylight = smoothstep(0, lightConfig.fullDaylightAt, sunHeight);
      const night = 1 - smoothstep(lightConfig.nightFrom, lightConfig.nightTo, sunHeight);
      const sunShows = 1 - night;

      const { overhead, horizon, sun, cloudInShade } = colours;
      setBlendOfThree(
        uniforms.uSkyOverhead.value,
        overhead.lowSun,
        overhead.day,
        Math.pow(daylight, colours.overheadEagerness),
        overhead.night,
        night,
      );
      setBlendOfThree(
        uniforms.uSkyHorizon.value,
        horizon.lowSun,
        horizon.day,
        daylight,
        horizon.night,
        night,
      );
      const sunHigh = Math.pow(daylight, colours.sunGoldenness);
      light.sunColour[0] = mix(sun.low[0], sun.high[0], sunHigh);
      light.sunColour[1] = mix(sun.low[1], sun.high[1], sunHigh);
      light.sunColour[2] = mix(sun.low[2], sun.high[2], sunHigh);
      uniforms.uSunColour.value.setRGB(light.sunColour[0], light.sunColour[1], light.sunColour[2]);

      const elevation = sunHeight - lightConfig.drawnLower;
      setPlaceInSky(uniforms.uSunDirection.value, sunHeight, isMorning);
      setPlaceInSky(uniforms.uMoonDirection.value, moonHeight, isMoonRising);

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
      uniforms.uCloudInSun.value.setRGB(
        cloudInSun.r * sunShows + moonlit[0] * night,
        cloudInSun.g * sunShows + moonlit[1] * night,
        cloudInSun.b * sunShows + moonlit[2] * night,
      );
      setBlendOfThree(
        uniforms.uCloudInShade.value,
        cloudInShade.lowSun,
        cloudInShade.day,
        daylight,
        cloudInShade.night,
        night,
      );
      uniforms.uNight.value = night;
      uniforms.uDaylight.value = daylight;

      light.daylight = daylight;
      light.night = night;
      light.sunElevation = elevation;
      light.timeOfDay = nameOf(sunHeight, isMorning);
    },
  };
}
