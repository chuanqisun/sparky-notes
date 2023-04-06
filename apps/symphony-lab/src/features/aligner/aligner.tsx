import { useCallback } from "preact/hooks";
import { type AppContext } from "../../main";
import { arrayToBulletList } from "../openai/format";
import "./aligner.css";
import { analyzeGoal, improveGoalContext } from "./prompts/goal";
import { analyzeReport, deflateReport, improveReportContext, inflateReport } from "./prompts/report";
import { useInputField } from "./use-input-field";
import { useMemoryAgent } from "./use-memory-agent";
import { useStdout } from "./use-stdout";

export interface AlignerProps {
  context: AppContext;
}
export function Aligner(props: AlignerProps) {
  const memoryAgent = useMemoryAgent({ context: props.context });
  const stdout = useStdout();

  const handleQuery = useCallback(
    async (query: string) => {
      const response = await memoryAgent.query(query);
      stdout.append(response);
      return "";
    },
    [memoryAgent.query, stdout.append]
  );

  const handleCommand = useCallback(
    async (command: string) => {
      await memoryAgent.add(command);
      stdout.append(`Executed ${command}`);
      return "";
    },
    [memoryAgent.add, stdout.append]
  );

  const goalField = useInputField();
  const requirementsField = useInputField();
  const contextField = useInputField();

  const reportField = useInputField();
  const evaluationField = useInputField();

  const handleUpdateRequirements = useCallback(async () => {
    const requirementList = await analyzeGoal(props.context, {
      goal: goalField.text,
      context: contextField.text,
    });

    requirementsField.setText(arrayToBulletList(requirementList.requirements));
  }, [goalField.text, contextField.text, requirementsField.setText]);

  const handleImproveContext = useCallback(async () => {
    const improvement = await improveGoalContext(props.context, {
      goal: goalField.text,
      context: contextField.text,
      requirements: requirementsField.text,
    });

    contextField.setText((prev) => [prev, arrayToBulletList(improvement.suggestions)].filter(Boolean).join("\n"));
  }, [goalField.text, contextField.text, contextField.setText, requirementsField.text]);

  const handleUpdateReport = useCallback(async () => {
    const { report } = await inflateReport(props.context, {
      goal: goalField.text,
      context: contextField.text,
      requirements: requirementsField.text,
    });

    reportField.setText(report);
  }, [goalField.text, contextField.text, requirementsField.text, reportField.setText]);

  const handleDeflateReport = useCallback(async () => {
    const { report } = await deflateReport(props.context, {
      goal: goalField.text,
      requirements: requirementsField.text,
      report: reportField.text,
    });

    reportField.setText(report);
  }, [goalField.text, reportField.text, requirementsField.text, reportField.setText]);

  const handleEvaluateReport = useCallback(async () => {
    const failureList = await analyzeReport(props.context, {
      goal: goalField.text,
      report: reportField.text,
      requirements: requirementsField.text,
    });

    evaluationField.setText(arrayToBulletList(failureList.failures));
  }, [stdout.append, goalField.text, reportField.text, requirementsField.text, evaluationField.setText]);

  const handleGetInfo = useCallback(async () => {
    const improvement = await improveReportContext(props.context, {
      goal: goalField.text,
      context: contextField.text,
      failures: evaluationField.text,
    });

    contextField.setText((prev) => [prev, arrayToBulletList(improvement.questions)].filter(Boolean).join("\n"));
  }, [goalField.text, contextField.text, contextField.setText, evaluationField.text]);

  return (
    <div class="c-duo">
      <menu>
        <button onClick={handleImproveContext}>Update context</button>
        <button onClick={handleUpdateRequirements}>Update requirements</button>
        <button onClick={handleUpdateReport}>Inflate report</button>
        <button onClick={handleDeflateReport}>Deflate report</button>
        <button onClick={handleEvaluateReport}>Evaluate report</button>
        <button onClick={handleGetInfo}>Request info</button>
      </menu>
      <label for="goal">Goal</label>
      <textarea id="goal" placeholder="Goal" onInput={goalField.handleInput} value={goalField.text} />
      <label for="goal-context">Context</label>
      <textarea
        id="goal-context"
        placeholder="Context"
        onInput={contextField.handleInput}
        rows={contextField.text.split("\n").length + 1}
        value={contextField.text}
      />
      <label for="requirements">Requirements</label>
      <textarea
        id="requirements"
        placeholder="Requirements"
        onInput={requirementsField.handleInput}
        rows={requirementsField.text.split("\n").length + 1}
        value={requirementsField.text}
      />
      <label for="report">Report</label>
      <textarea id="report" placeholder="Report" onInput={reportField.handleInput} rows={reportField.text.split("\n").length + 1} value={reportField.text} />
      <label for="evaluation">Evaluation</label>
      <textarea
        id="evaluation"
        placeholder="Evaluation"
        onInput={evaluationField.handleInput}
        rows={evaluationField.text.split("\n").length + 1}
        value={evaluationField.text}
      />
      {stdout.entries.length ? (
        <div class="c-stdout" ref={stdout.stdoutRef}>
          {stdout.entries.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
