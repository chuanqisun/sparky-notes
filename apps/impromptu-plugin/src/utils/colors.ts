export const stickyColors = {
  Yellow: {
    r: 1,
    g: 0.8509804010391235,
    b: 0.4000000059604645,
  },
  Green: {
    r: 0.5215686559677124,
    g: 0.8784313797950745,
    b: 0.6392157077789307,
  },
  LightGray: {
    r: 0.9019607901573181,
    g: 0.9019607901573181,
    b: 0.9019607901573181,
  },
} satisfies Record<string, RGB>;

export type MappedColorNames = keyof typeof stickyColors;

export const sectionColors = {
  Yellow: {
    r: 1,
    g: 0.970588207244873,
    b: 0.8741176724433899,
  },
};

export function getSolidFill(rgb: RGB): SolidPaint {
  return {
    type: "SOLID",
    color: {
      ...rgb,
    },
  };
}

export function getClosestColor(rgb: RGB, fallback: MappedColorNames): MappedColorNames {
  const candidate = Object.entries(stickyColors)
    .map(([key, knownRgb]) => ({
      key,
      distance: getRgbDistance(rgb, knownRgb),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (candidate.distance > 0.1) return fallback;
  return candidate.key as MappedColorNames;
}

function getRgbDistance(a: RGB, b: RGB): number {
  const rMean = (a.r + b.r) / 2;
  return (2 + rMean / 1) * Math.pow(a.r - b.r, 2) + 4 * Math.pow(a.g - b.g, 2) + (2 + (1 - rMean) / 1) * Math.pow(a.b - b.b, 2);
}
