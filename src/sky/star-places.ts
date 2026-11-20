// The real sky's brightest stars and best-known figures, where they stand among the stars, so that
// someone who knows the sky finds them: the rest of the stars are scattered at random (stars.ts).
// Places are approximate, to a few hundredths of an hour and of a degree, near enough to the year
// 2000: right ascension in hours, declination in degrees. Magnitudes are as the eye sees them
// (a star of variable brightness at its usual), the colour is the star's spectral class.

/** The colour a star shows, by its spectral class: blue-white (B, and the rare O) to orange-red (M). */
export type StarColourClass = 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

/** A place among the stars: right ascension in hours, declination in degrees. */
export interface SkyPlace {
  rightAscension: number;
  declination: number;
}

export type StarPlace = readonly [
  name: string,
  rightAscension: number,
  declination: number,
  magnitude: number,
  colour: StarColourClass,
];

/** The galaxy's north pole and its centre, which lies in Sagittarius, close by Scorpius. */
export const GALACTIC_NORTH_POLE: SkyPlace = { rightAscension: 12.857, declination: 27.13 };
export const GALACTIC_CENTRE: SkyPlace = { rightAscension: 17.761, declination: -29.01 };

export const STAR_PLACES: readonly StarPlace[] = [
  // Orion: the shoulders, the feet, the belt, the head and the sword.
  ['Betelgeuse', 5.919, 7.41, 0.5, 'M'],
  ['Rigel', 5.242, -8.2, 0.13, 'B'],
  ['Bellatrix', 5.419, 6.35, 1.64, 'B'],
  ['Saiph', 5.796, -9.67, 2.07, 'B'],
  ['Alnitak', 5.679, -1.94, 1.77, 'B'],
  ['Alnilam', 5.604, -1.2, 1.69, 'B'],
  ['Mintaka', 5.533, -0.3, 2.23, 'B'],
  ['Meissa', 5.586, 9.93, 3.39, 'B'],
  ['Hatysa', 5.591, -5.91, 2.77, 'B'],
  ['the Orion Nebula', 5.588, -5.39, 4.0, 'B'],
  // Canis Major and Canis Minor.
  ['Sirius', 6.752, -16.72, -1.46, 'A'],
  ['Mirzam', 6.378, -17.96, 1.98, 'B'],
  ['Adhara', 6.977, -28.97, 1.5, 'B'],
  ['Wezen', 7.14, -26.39, 1.84, 'F'],
  ['Aludra', 7.402, -29.3, 2.45, 'B'],
  ['Procyon', 7.655, 5.22, 0.34, 'F'],
  // Taurus, the Pleiades, Auriga, Gemini and Perseus.
  ['Aldebaran', 4.599, 16.51, 0.86, 'K'],
  ['Elnath', 5.438, 28.61, 1.65, 'B'],
  ['Alcyone', 3.791, 24.11, 2.87, 'B'],
  ['Atlas', 3.819, 24.05, 3.62, 'B'],
  ['Electra', 3.748, 24.11, 3.7, 'B'],
  ['Maia', 3.764, 24.37, 3.87, 'B'],
  ['Merope', 3.772, 23.95, 4.18, 'B'],
  ['Taygeta', 3.753, 24.47, 4.3, 'B'],
  ['Capella', 5.278, 46.0, 0.08, 'G'],
  ['Menkalinan', 5.992, 44.95, 1.9, 'A'],
  ['Pollux', 7.755, 28.03, 1.14, 'K'],
  ['Castor', 7.577, 31.89, 1.58, 'A'],
  ['Alhena', 6.629, 16.4, 1.92, 'A'],
  ['Mirfak', 3.405, 49.86, 1.79, 'F'],
  ['Algol', 3.136, 40.96, 2.1, 'B'],
  // The southern sky round Canopus: Carina, Vela, Puppis.
  ['Canopus', 6.399, -52.7, -0.74, 'F'],
  ['Miaplacidus', 9.22, -69.72, 1.67, 'A'],
  ['Avior', 8.375, -59.51, 1.86, 'K'],
  ['Aspidiske', 9.285, -59.28, 2.21, 'A'],
  ['Theta Carinae', 10.716, -64.39, 2.76, 'B'],
  ['Gamma Velorum', 8.159, -47.34, 1.83, 'B'],
  ['Delta Velorum', 8.745, -54.71, 1.96, 'A'],
  ['Suhail', 9.133, -43.43, 2.21, 'K'],
  ['Kappa Velorum', 9.369, -55.01, 2.47, 'B'],
  ['Naos', 8.06, -40.0, 2.21, 'B'],
  ['Achernar', 1.629, -57.24, 0.46, 'B'],
  // The Southern Cross, and the two Pointers in Centaurus that lead to it.
  ['Acrux', 12.443, -63.1, 0.76, 'B'],
  ['Mimosa', 12.795, -59.69, 1.25, 'B'],
  ['Gacrux', 12.519, -57.11, 1.63, 'M'],
  ['Imai', 12.252, -58.75, 2.79, 'B'],
  ['Ginan', 12.356, -60.4, 3.59, 'K'],
  ['Rigil Kentaurus', 14.66, -60.83, -0.27, 'G'],
  ['Hadar', 14.064, -60.37, 0.61, 'B'],
  ['Menkent', 14.111, -36.37, 2.06, 'K'],
  ['Muhlifain', 12.692, -48.96, 2.17, 'A'],
  ['Epsilon Centauri', 13.665, -53.47, 2.3, 'B'],
  ['Eta Centauri', 14.592, -42.16, 2.35, 'B'],
  ['Zeta Centauri', 13.926, -47.29, 2.55, 'B'],
  ['Delta Centauri', 12.139, -50.72, 2.52, 'B'],
  ['Alpha Lupi', 14.699, -47.39, 2.3, 'B'],
  ['Atria', 16.811, -69.03, 1.91, 'K'],
  ['Beta Trianguli Australis', 15.919, -63.43, 2.85, 'F'],
  ['Gamma Trianguli Australis', 15.315, -68.68, 2.87, 'A'],
  ['Peacock', 20.427, -56.74, 1.94, 'B'],
  // Scorpius, from its claws by Antares, the heart, down the body to the sting.
  ['Antares', 16.49, -26.43, 0.96, 'M'],
  ['Acrab', 16.091, -19.81, 2.62, 'B'],
  ['Dschubba', 16.006, -22.62, 2.29, 'B'],
  ['Fang', 15.981, -26.11, 2.89, 'B'],
  ['Alniyat', 16.353, -25.59, 2.9, 'B'],
  ['Paikauhale', 16.598, -28.22, 2.82, 'B'],
  ['Larawag', 16.836, -34.29, 2.29, 'K'],
  ['Xamidimura', 16.865, -38.05, 3.04, 'B'],
  ['Zeta Scorpii', 16.91, -42.36, 3.62, 'K'],
  ['Eta Scorpii', 17.203, -43.24, 3.33, 'F'],
  ['Sargas', 17.622, -43.0, 1.86, 'F'],
  ['Iota Scorpii', 17.793, -40.13, 3.03, 'F'],
  ['Girtab', 17.708, -39.03, 2.41, 'B'],
  ['Shaula', 17.56, -37.1, 1.62, 'B'],
  ['Lesath', 17.513, -37.3, 2.7, 'B'],
  // Sagittarius, the Teapot, over the galaxy's centre; Ophiuchus above it.
  ['Kaus Australis', 18.403, -34.38, 1.85, 'B'],
  ['Kaus Media', 18.35, -29.83, 2.7, 'K'],
  ['Kaus Borealis', 18.466, -25.42, 2.81, 'K'],
  ['Alnasl', 18.097, -30.42, 2.98, 'K'],
  ['Nunki', 18.921, -26.3, 2.05, 'B'],
  ['Ascella', 19.044, -29.88, 2.6, 'A'],
  ['Phi Sagittarii', 18.761, -26.99, 3.17, 'B'],
  ['Tau Sagittarii', 19.116, -27.67, 3.32, 'K'],
  ['Eta Sagittarii', 18.294, -36.76, 3.1, 'M'],
  ['Rasalhague', 17.582, 12.56, 2.07, 'A'],
  ['Sabik', 17.173, -15.72, 2.43, 'A'],
  // The Big Dipper, the Little Dipper's end, and the stars of spring.
  ['Dubhe', 11.062, 61.75, 1.79, 'K'],
  ['Merak', 11.031, 56.38, 2.37, 'A'],
  ['Phecda', 11.897, 53.69, 2.44, 'A'],
  ['Megrez', 12.257, 57.03, 3.31, 'A'],
  ['Alioth', 12.901, 55.96, 1.77, 'A'],
  ['Mizar', 13.399, 54.93, 2.04, 'A'],
  ['Alkaid', 13.792, 49.31, 1.86, 'B'],
  ['Polaris', 2.53, 89.26, 1.98, 'F'],
  ['Kochab', 14.845, 74.16, 2.07, 'K'],
  ['Arcturus', 14.261, 19.18, -0.05, 'K'],
  ['Izar', 14.75, 27.07, 2.37, 'K'],
  ['Alphecca', 15.578, 26.71, 2.22, 'A'],
  ['Spica', 13.42, -11.16, 0.97, 'B'],
  ['Regulus', 10.14, 11.97, 1.35, 'B'],
  ['Algieba', 10.333, 19.84, 2.08, 'K'],
  ['Zosma', 11.235, 20.52, 2.56, 'A'],
  ['Denebola', 11.818, 14.57, 2.13, 'A'],
  ['Alphard', 9.46, -8.66, 1.98, 'K'],
  // The summer triangle (Vega, Deneb, Altair) and its figures.
  ['Vega', 18.616, 38.78, 0.03, 'A'],
  ['Sheliak', 18.835, 33.36, 3.5, 'B'],
  ['Sulafat', 18.982, 32.69, 3.24, 'B'],
  ['Deneb', 20.691, 45.28, 1.25, 'A'],
  ['Sadr', 20.37, 40.26, 2.23, 'F'],
  ['Aljanah', 20.77, 33.97, 2.48, 'K'],
  ['Fawaris', 19.749, 45.13, 2.87, 'B'],
  ['Albireo', 19.512, 27.96, 3.05, 'K'],
  ['Altair', 19.846, 8.87, 0.76, 'A'],
  ['Tarazed', 19.771, 10.61, 2.72, 'K'],
  ['Alshain', 19.922, 6.41, 3.71, 'G'],
  ['Eltanin', 17.943, 51.49, 2.24, 'K'],
  // Autumn: Pegasus, Andromeda, Cassiopeia, and the lone bright stars of the south.
  ['Markab', 23.079, 15.21, 2.48, 'B'],
  ['Scheat', 23.063, 28.08, 2.42, 'M'],
  ['Algenib', 0.221, 15.18, 2.83, 'B'],
  ['Enif', 21.736, 9.88, 2.38, 'K'],
  ['Alpheratz', 0.14, 29.09, 2.06, 'B'],
  ['Mirach', 1.162, 35.62, 2.05, 'M'],
  ['Almach', 2.065, 42.33, 2.1, 'K'],
  ['Hamal', 2.12, 23.46, 2.0, 'K'],
  ['Caph', 0.153, 59.15, 2.28, 'F'],
  ['Schedar', 0.675, 56.54, 2.24, 'K'],
  ['Gamma Cassiopeiae', 0.945, 60.72, 2.47, 'B'],
  ['Ruchbah', 1.43, 60.24, 2.68, 'A'],
  ['Segin', 1.907, 63.67, 3.37, 'B'],
  ['Fomalhaut', 22.961, -29.62, 1.16, 'A'],
  ['Diphda', 0.726, -17.99, 2.04, 'K'],
  ['Alnair', 22.137, -46.96, 1.74, 'B'],
  ['Ankaa', 0.438, -42.31, 2.4, 'K'],
];
