var bibtex = "";

// bib to json
var result = JSON.stringify(
  bibtex
    .split(`@inproceedings`)
    .filter(Boolean)
    .map((paper) => Object.fromEntries([...paper.matchAll(/(\w+) = \{(.+?)\}/gim)].map((matchInstance) => matchInstance.slice(1))))
);

// json to text
var output = JSON.parse(result)
  .map((item) => Object.fromEntries(Object.entries(item).filter(([key, value]) => ["title", "url", "abstract"].includes(key))))
  .map((item) => `Title: ${item.title}\nAbstract: ${item.abstract}\nURL: ${item.url}`)
  .join("\n\n");
