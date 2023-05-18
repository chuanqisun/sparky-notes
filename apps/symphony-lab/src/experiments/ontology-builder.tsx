import type React from "react";
import { useState } from "react";
import { useModelSelector } from "../account/model-selector";
import { AutoResize } from "../form/auto-resize";
import { CenterClamp } from "../shell/center-clamp";

export const OntologyBuilder: React.FC = () => {
  const { chat, ModelSelectorElement } = useModelSelector();

  const extrapolate = async (domainDescription: string, axioms: string) => {
    return chat(
      [
        {
          role: "system",
          content: `
You are an ontological engineer. The user will provide you with a domain description and a set of axioms.
You will start with a set of known axioms and extrapolate new axioms based on the known axioms.

Requirement:
1. Respond with a list of axioms
2. Each axioms must use the triple format: Subject -> Predicate -> Object
3. the predicate must contain causal relations
4. the subjects and objects are be related to the domain
5. the subjects and objects must be atomic. Break down complex subjects and objects into smaller axioms
6. Generate exactly 5 axioms

Use this format
New axioms:
- <subject> -> <predicate> -> <object>
- <subject> -> <predicate> -> <object>
...
    `.trim(),
        },
        {
          role: "user",
          content: `
Domain description:
${domainDescription}

Known axioms:
${axioms}
`.trim(),
        },
      ],
      { max_tokens: 3200 }
    ).then(extractTriples);
  };

  const [domainDescription, setDomainDescription] = useState(`UX Research and Design`);
  const [seedAxioms, setSeedAxioms] = useState(`- User -> interacts with -> Product`);
  const [axioms, setAxioms] = useState(``);

  const iterate = async () => {
    let currentAxioms = extractTriples(seedAxioms);

    for (let i = 0; i < 5; i++) {
      const sampledAxioms = sample(currentAxioms, 3).join("\n");
      await extrapolate(domainDescription, sampledAxioms).then((newAxioms) => {
        const prevAxiomCount = currentAxioms.length;
        currentAxioms = [...new Set([...currentAxioms, ...newAxioms].sort())];
        console.log(`epoch ${i + 1}, ${currentAxioms.length - prevAxiomCount} new\n${newAxioms.join("\n")}`);
      });
    }

    console.log("final result", currentAxioms.join("\n"));
    setAxioms(currentAxioms.join("\n"));
  };

  const download = async () => {
    await downloadFile(stringToFile(axioms, "axioms.txt"));
  };

  return (
    <CenterClamp>
      <AutoResize data-resize-textarea-content={domainDescription}>
        <textarea value={domainDescription} onChange={(e) => setDomainDescription(e.target.value)} />
      </AutoResize>
      <AutoResize data-resize-textarea-content={seedAxioms}>
        <textarea value={seedAxioms} onChange={(e) => setSeedAxioms(e.target.value)} />
      </AutoResize>
      <menu>{ModelSelectorElement}</menu>
      <button
        onClick={() => {
          iterate();
        }}
      >
        Test
      </button>
      <button onClick={() => download()}>Export</button>
    </CenterClamp>
  );
};

function sample<T>(array: T[], count: number): T[] {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function extractTriples(list: string) {
  return [...list.matchAll(/- (.*) -> (.*) -> (.*)/g)].map((match) =>
    match
      .slice(1, 4)
      .map((word) => word.toLocaleLowerCase())
      .join(" -> ")
  );
}

export function stringToFile(input: string, filename: string): File {
  const blob = new Blob([input], { type: "text/plain" });
  return new File([blob], filename);
}

export async function downloadFile(file: File) {
  const handle: FileSystemFileHandle = await (window as any).showSaveFilePicker({
    suggestedName: file.name,
  });
  const writable = await (handle as any).createWritable();
  await writable.write(file);
  await writable.close();
}
