/**
 * Ideas
 * 
 * Use the following prompt template as an example

Define a javascript function based on the provided goal. It must use the following signature

```
async function transform(input: InputType): any

interface InputType {
  entries: IEntry[];
}

interface IEntry {
  id: number;
  speakerName: string;
  speech: string;
  timestampStart: string;
  speechDuration: number;
}
```

Approach the design top down. You can use AI when the problem cannot be solved with a deterministic algorithm.  Encapsulate any AI-powered transforms into async functions. When calling AI-powered functions, the function must be under the `ai` object, like this: `ai.fnName(...args)`.

Repsond with the javascript source code, and for each AI function, describe the expected input and output. Make sure to run any async functions in parallel.


*
* Use the above template to generate a top-down algorithm. We can interpret the function lazy, so when an `ai` function call is invoked,
* we can implement that function on the fly with llm.
*/
