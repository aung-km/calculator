import { useEffect, useState } from "react";

import {
  calculateAndFetchHistory,
  clearAndFetchHistory,
  fetchHistory,
} from "./api";
import Button from "./Button";
import { createLatestRequestGate } from "./historyRequests";
import ThemeContext from "./ThemeContext";

const buttonRows = [
  [
    { value: "⌫", label: "backspace", variant: "utility" },
    { value: "AC", variant: "utility" },
    { value: "%", variant: "utility" },
    { value: "÷", label: "divide", variant: "utility" },
  ],
  [
    { value: "7" },
    { value: "8" },
    { value: "9" },
    { value: "×", label: "multiply", variant: "operator" },
  ],
  [
    { value: "4" },
    { value: "5" },
    { value: "6" },
    { value: "−", label: "subtract", variant: "operator" },
  ],
  [
    { value: "1" },
    { value: "2" },
    { value: "3" },
    { value: "+", label: "add", variant: "operator" },
  ],
  [
    { value: "±", label: "change sign" },
    { value: "0" },
    { value: ".", label: "decimal point" },
    { value: "=", label: "equals", variant: "operator" },
  ],
];

const operators = ["÷", "×", "−", "+"];

function formatResult(value) {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  return Number.parseFloat(value.toPrecision(12))
    .toString()
    .replaceAll("-", "−");
}

function calculate(expression) {
  const normalizedExpression = expression
    .replaceAll("÷", "/")
    .replaceAll("×", "*")
    .replaceAll("−", "-");

  if (!/^[\deE+\-*/.()\s]+$/.test(normalizedExpression)) {
    throw new Error("Invalid expression");
  }

  return Function(`"use strict"; return (${normalizedExpression})`)();
}

function applyPercent(expression) {
  let operatorIndex = -1;

  for (let index = expression.length - 1; index > 0; index -= 1) {
    const isExponentSign = ["e", "E"].includes(expression[index - 1]);
    const isUnarySign = expression[index - 1] === "(";

    if (
      operators.includes(expression[index]) &&
      !isExponentSign &&
      !isUnarySign
    ) {
      operatorIndex = index;
      break;
    }
  }

  if (operatorIndex === -1) {
    return formatResult(calculate(expression) / 100);
  }

  const leftExpression = expression.slice(0, operatorIndex);
  const operator = expression[operatorIndex];
  const operandExpression = expression.slice(operatorIndex + 1);
  const percentage = calculate(operandExpression) / 100;
  const percentageValue = ["+", "−"].includes(operator)
    ? calculate(leftExpression) * percentage
    : percentage;

  return `${leftExpression}${operator}${formatResult(percentageValue)}`;
}

function getTrailingOperand(expression) {
  const wrappedOperand = expression.match(
    /\(−((?:\d+(?:\.\d*)?|\.\d+)(?:e[+−-]?\d+)?)\)$/i,
  );

  if (wrappedOperand) {
    return {
      start: wrappedOperand.index,
      value: wrappedOperand[1],
      wrapped: true,
    };
  }

  const operand = expression.match(
    /((?:\d+(?:\.\d*)?|\.\d+)(?:e[+−-]?\d+)?)$/i,
  );

  if (!operand) {
    return null;
  }

  return { start: operand.index, value: operand[1], wrapped: false };
}

function toggleSign(expression) {
  const operand = getTrailingOperand(expression);

  if (!operand) {
    return expression;
  }

  const prefix = expression.slice(0, operand.start);

  if (operand.wrapped) {
    return `${prefix}${operand.value}`;
  }

  if (prefix === "−") {
    return operand.value;
  }

  return prefix ? `${prefix}(−${operand.value})` : `−${operand.value}`;
}

function BackspaceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[42%] w-[42%]"
      viewBox="0 0 32 28"
      fill="none"
    >
      <path
        d="M11.3 3.5h14.2a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H11.3L3.5 14l7.8-10.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m16 10 8 8m0-8-8 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.5 8.5 0 1 0 20.4 15.3Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function App() {
  const [input, setInput] = useState("0");
  const [overwriteNext, setOverwriteNext] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState("loading");
  const [historyError, setHistoryError] = useState("");
  const [calculationError, setCalculationError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [historyRequestGate] = useState(createLatestRequestGate);
  const isBusy = isCalculating || isClearing;

  useEffect(() => {
    const request = historyRequestGate.begin();

    async function loadHistory() {
      try {
        const entries = await fetchHistory();

        if (historyRequestGate.isLatest(request)) {
          setHistory(entries);
          setHistoryState("ready");
        }
      } catch (error) {
        if (historyRequestGate.isLatest(request)) {
          setHistoryError(errorMessage(error));
          setHistoryState("error");
        }
      }
    }

    loadHistory();

    return () => {
      historyRequestGate.invalidate();
    };
  }, [historyRequestGate]);

  const handleClick = async (value) => {
    if (isBusy) {
      return;
    }

    if (value === "AC") {
      setInput("0");
      setOverwriteNext(false);
      return;
    }

    if (value === "⌫") {
      const operand = getTrailingOperand(input);

      if (operand?.wrapped) {
        const shortenedOperand = operand.value.slice(0, -1);
        setInput(
          `${input.slice(0, operand.start)}${
            shortenedOperand ? `(−${shortenedOperand})` : "0"
          }`,
        );
        setOverwriteNext(false);
        return;
      }

      if (input.startsWith("−") && input.length === 2) {
        setInput("0");
        setOverwriteNext(false);
        return;
      }

      setInput(
        input === "Error" || input.length === 1 || overwriteNext
          ? "0"
          : input.slice(0, -1),
      );
      setOverwriteNext(false);
      return;
    }

    if (value === "=") {
      const historyRequest = historyRequestGate.begin();
      setCalculationError("");
      setIsCalculating(true);

      try {
        const {
          calculation,
          history: refreshedHistory,
          historyError: refreshError,
        } = await calculateAndFetchHistory(input);
        setInput(formatResult(Number(calculation.result)));

        if (historyRequestGate.isLatest(historyRequest)) {
          if (refreshError) {
            setHistoryError(errorMessage(refreshError));
            setHistoryState("error");
          } else {
            setHistory(refreshedHistory);
            setHistoryState("ready");
            setHistoryError("");
          }
        }
      } catch (error) {
        setInput("Error");
        setCalculationError(errorMessage(error));
      } finally {
        setIsCalculating(false);
      }

      setOverwriteNext(true);
      return;
    }

    if (value === "%") {
      try {
        setInput(applyPercent(input));
      } catch {
        setInput("Error");
      }
      setOverwriteNext(true);
      return;
    }

    if (value === "±") {
      if (
        input === "Error" ||
        input === "0" ||
        operators.includes(input.at(-1))
      ) {
        return;
      }

      setInput(toggleSign(input));
      return;
    }

    if (operators.includes(value)) {
      if (input === "Error") {
        setInput("0");
        setOverwriteNext(false);
        return;
      }

      const lastCharacter = input.at(-1);
      setInput(
        operators.includes(lastCharacter)
          ? `${input.slice(0, -1)}${value}`
          : `${input}${value}`,
      );
      setOverwriteNext(false);
      return;
    }

    if (overwriteNext || input === "Error") {
      setInput(value === "." ? "0." : value);
      setOverwriteNext(false);
      return;
    }

    const currentOperand = getTrailingOperand(input);

    if (value === ".") {
      if (currentOperand?.value.includes(".")) {
        return;
      }

      if (operators.includes(input.at(-1))) {
        setInput(`${input}0.`);
        return;
      }
    }

    if (currentOperand?.wrapped) {
      const nextOperand =
        currentOperand.value === "0" && /^\d$/.test(value)
          ? value
          : currentOperand.value + value;
      setInput(`${input.slice(0, currentOperand.start)}(−${nextOperand})`);
      return;
    }

    if (/^\d$/.test(value) && currentOperand?.value === "0") {
      setInput(`${input.slice(0, currentOperand.start)}${value}`);
      return;
    }

    setInput(input.length < 28 ? input + value : input);
  };

  const handleClearHistory = async () => {
    if (isBusy) {
      return;
    }

    const historyRequest = historyRequestGate.begin();
    setHistoryError("");
    setIsClearing(true);

    try {
      const { history: refreshedHistory, historyError: refreshError } =
        await clearAndFetchHistory();

      if (historyRequestGate.isLatest(historyRequest)) {
        setHistory(refreshedHistory);

        if (refreshError) {
          setHistoryError(errorMessage(refreshError));
          setHistoryState("error");
        } else {
          setHistoryState("ready");
        }
      }
    } catch (error) {
      if (historyRequestGate.isLatest(historyRequest)) {
        setHistoryError(errorMessage(error));
        setHistoryState("error");
      }
    } finally {
      setIsClearing(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext value={theme}>
      <main
        className={`min-h-dvh px-4 py-6 font-sans transition-colors sm:px-8 sm:py-10 ${
          isDark ? "bg-[#111827] text-white" : "bg-[#f1f2f4] text-[#111827]"
        }`}
      >
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Calculator
            </h1>

            <button
              type="button"
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
              aria-pressed={!isDark}
              className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm transition-colors hover:cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#ff6500] ${
                isDark
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              <ThemeIcon theme={theme} />
              {isDark ? "Light" : "Dark"}
            </button>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:gap-8">
            <section
              aria-label="Calculator"
              className={`w-full max-w-[390px] justify-self-center rounded-[3rem] px-6 pt-10 pb-9 shadow-[0_30px_70px_rgba(15,23,42,0.2)] transition-colors sm:px-8 sm:pt-12 sm:pb-11 ${
                isDark ? "bg-black" : "bg-white"
              }`}
            >
              <div className="flex h-28 items-end justify-end overflow-hidden px-2 pb-4 sm:h-32">
                <output
                  aria-live="polite"
                  aria-label="Calculation result"
                  className={`max-w-full overflow-hidden text-right text-[clamp(3.5rem,16vw,5rem)] leading-none font-light tracking-tight text-ellipsis whitespace-nowrap ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}
                >
                  {isCalculating ? "…" : input}
                </output>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {buttonRows.flat().map(({ value, label, variant }) => (
                  <Button
                    key={value}
                    aria-label={label ?? value}
                    disabled={isBusy}
                    variant={variant}
                    onClick={() => handleClick(value)}
                  >
                    {value === "⌫" ? <BackspaceIcon /> : value}
                  </Button>
                ))}
              </div>

              {calculationError && (
                <p
                  role="alert"
                  className="mt-5 text-center text-sm text-red-400"
                >
                  {calculationError}
                </p>
              )}
            </section>

            <section
              aria-labelledby="history-heading"
              className={`min-h-72 rounded-3xl p-5 shadow-[0_20px_55px_rgba(15,23,42,0.12)] transition-colors sm:p-6 ${
                isDark ? "bg-slate-800" : "bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}
              >
                <div>
                  <h2 id="history-heading" className="text-xl font-semibold">
                    History
                  </h2>
                  <p
                    className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Latest calculations from the server
                  </p>
                </div>

                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#ff6500] disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDark
                      ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  disabled={isBusy}
                  onClick={handleClearHistory}
                >
                  {isClearing ? "Clearing…" : "Clear"}
                </button>
              </div>

              <div aria-live="polite" className="pt-4">
                {historyState === "loading" && (
                  <p className={isDark ? "text-slate-400" : "text-slate-500"}>
                    Loading history…
                  </p>
                )}

                {historyState === "error" && (
                  <p role="alert" className="text-sm text-red-400">
                    {historyError}
                  </p>
                )}

                {historyState === "ready" && history.length === 0 && (
                  <p className={isDark ? "text-slate-400" : "text-slate-500"}>
                    No calculations yet.
                  </p>
                )}

                {historyState === "ready" && history.length > 0 && (
                  <ol className="space-y-3">
                    {history.map((entry, index) => (
                      <li
                        key={`${entry.timestamp}-${index}`}
                        className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-3 ${
                          isDark ? "bg-slate-900/70" : "bg-slate-100"
                        }`}
                      >
                        <span
                          className={`min-w-0 truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}
                        >
                          {entry.expr}
                        </span>
                        <strong className="shrink-0 text-lg font-semibold">
                          = {formatResult(Number(entry.result))}
                        </strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </ThemeContext>
  );
}

export default App;
