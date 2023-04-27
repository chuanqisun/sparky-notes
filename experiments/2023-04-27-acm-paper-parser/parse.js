let bibtex = "";
let result = JSON.stringify(
  bibtex
    .split(`@inproceedings`)
    .filter(Boolean)
    .map((paper) => Object.fromEntries([...paper.matchAll(/(\w+) = \{(.+?)\}/gim)].map((matchInstance) => matchInstance.slice(1))))
);
