import type React from "react";
import { useState } from "react";
import { useModelSelector } from "../account/model-selector";
import { AutoResize } from "../form/auto-resize";
import { CenterClamp } from "../shell/center-clamp";

export const TheoryBuilder: React.FC = () => {
  const { chat, embed, ModelSelectorElement } = useModelSelector();

  const extrapolate = async (domainDescription: string, axioms: string) => {
    chat(
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
6. Generate exactly 10 axioms

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
    ).then((chatResult) => [...chatResult.matchAll(/- (.*) -> (.*) -> (.*)/g)].map((match) => match.slice(1, 4)).map((triple) => console.log(triple)));
  };

  const [domainDescription, setDomainDescription] = useState(`UX Research and Design`);
  const [seedAxioms, setSeedAxioms] = useState(`- User -> interacts with -> Product`);

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
          extrapolate(domainDescription, seedAxioms);
        }}
      >
        Test
      </button>
    </CenterClamp>
  );
};
