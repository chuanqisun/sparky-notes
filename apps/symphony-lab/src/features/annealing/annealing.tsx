import { useCallback, useEffect, useRef } from "preact/hooks";
import { type AppContext } from "../../main";
import { EventLoop } from "../../utils/event-loop";
import { arrayToBulletList } from "../openai/format";
import "./annealing.css";
import { analyzeGoal, improveGoalContext, simulateHumanEffort } from "./prompts/goal";
import { deflateReport, evaluateReport, improveReportContext, inflateReport } from "./prompts/report";
import { useInputField } from "./use-input-field";
import { useStdout } from "./use-stdout";

const autoEventLoop = new EventLoop();
let currentAutoRunStep = 0;
let currentEpoch = 0;

export interface AlignerProps {
  context: AppContext;
}
export function Aligner(props: AlignerProps) {
  const stdout = useStdout();

  const goalField = useInputField();
  const requirementsField = useInputField();
  const contextField = useInputField();

  const warmReportField = useInputField();
  const coolReportField = useInputField();
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

  const handleSimulateHumanEffort = useCallback(async () => {
    const { newContext } = await simulateHumanEffort(props.context, {
      goal: goalField.text,
      context: contextField.text,
    });

    contextField.setText([arrayToBulletList(newContext)].filter(Boolean).join("\n"));
  }, [goalField.text, contextField.text, contextField.setText, requirementsField.text]);

  const handleInflateReport = useCallback(async () => {
    const { report } = await inflateReport(props.context, {
      goal: goalField.text,
      context: contextField.text,
      requirements: requirementsField.text,
    });

    warmReportField.setText(report);
  }, [goalField.text, contextField.text, requirementsField.text, warmReportField.setText]);

  const handleDeflateReport = useCallback(async () => {
    const { report } = await deflateReport(props.context, {
      goal: goalField.text,
      context: contextField.text,
      report: warmReportField.text,
    });

    coolReportField.setText(report);
  }, [goalField.text, warmReportField.text, contextField.text, coolReportField.setText]);

  const handleEvaluateReport = useCallback(async () => {
    const failureList = await evaluateReport(props.context, {
      goal: goalField.text,
      report: coolReportField.text,
      requirements: requirementsField.text,
    });

    evaluationField.setText(arrayToBulletList(failureList.failures));
  }, [stdout.append, goalField.text, coolReportField.text, requirementsField.text, evaluationField.setText]);

  const handleGetInfo = useCallback(async () => {
    const improvement = await improveReportContext(props.context, {
      goal: goalField.text,
      context: contextField.text,
      failures: evaluationField.text,
    });

    contextField.setText((prev) => [prev, arrayToBulletList(improvement.questions)].filter(Boolean).join("\n"));
  }, [goalField.text, contextField.text, contextField.setText, evaluationField.text]);

  const steps = [
    handleImproveContext,
    handleSimulateHumanEffort,
    handleUpdateRequirements,
    handleInflateReport,
    handleDeflateReport,
    handleEvaluateReport,
    handleGetInfo,
    handleSimulateHumanEffort,
  ];

  const autoRunSteps = useRef(steps);

  useEffect(() => {
    autoRunSteps.current = steps;
  }, steps);

  useEffect(() => {
    const handleTick = async () => {
      try {
        stdout.append(`epoch ${currentEpoch}, step ${currentAutoRunStep}`);
        const step = autoRunSteps.current[currentAutoRunStep];
        await step();
        if (autoEventLoop.isAborted()) return;
        stdout.appendInline(`...done`);

        currentAutoRunStep = (currentAutoRunStep + 1) % autoRunSteps.current.length;
        if (currentAutoRunStep === 0) {
          currentEpoch++;
        }
      } catch (e: any) {
        autoEventLoop.stop();
        console.error(e);
      }
    };
    const cleanUp = autoEventLoop.on("tick", handleTick);

    return () => cleanUp();
  }, []);

  const handleStopRun = useCallback(async () => {
    autoEventLoop.stop();
  }, []);

  const handleAutoRun = useCallback(async () => {
    autoEventLoop.start();
  }, []);

  return (
    <div class="c-duo">
      <menu>
        <button onClick={handleAutoRun}>Start</button>
        <button onClick={handleStopRun}>Stop</button>
      </menu>
      <menu>
        <button onClick={handleImproveContext}>Update context</button>
        <button onClick={handleSimulateHumanEffort}>Simulate human effort</button>
        <button onClick={handleUpdateRequirements}>Update outline</button>
        <button onClick={handleInflateReport}>Warm up report</button>
        <button onClick={handleDeflateReport}>Cool down report</button>
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
      <label for="requirements">Outline</label>
      <textarea
        id="requirements"
        placeholder="Requirements"
        onInput={requirementsField.handleInput}
        rows={requirementsField.text.split("\n").length + 1}
        value={requirementsField.text}
      />
      <label for="report-warm">Report (warm)</label>
      <textarea
        id="report-warm"
        placeholder="Report (warm)"
        onInput={warmReportField.handleInput}
        rows={warmReportField.text.split("\n").length + 1}
        value={warmReportField.text}
      />
      <label for="report-cool">Report (cool)</label>
      <textarea
        id="report-cool"
        placeholder="Report (cool)"
        onInput={coolReportField.handleInput}
        rows={coolReportField.text.split("\n").length + 1}
        value={coolReportField.text}
      />
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
