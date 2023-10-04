export function setFillColor(color: RGB, node: StickyNode | SectionNode) {
  node.fills = [getSolidFill(color)];
}

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
