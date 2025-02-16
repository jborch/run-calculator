import React, { useEffect, useState } from "react";
import {
  Calculation,
  Constant,
  Distance,
  Duration,
  Format,
  HalfMarathon,
  Marathon,
  Operator,
  Pace,
  Part,
  Speed,
  tokenize,
} from "./models/calculator";
import "./index.css";
import { get, save } from "./storage";

const example_5k = {
  input: "5km in 25min",
  result: tokenize("5km in 25min", Format.Metric),
};
const example_4_25 = {
  input: "4:25 for 20min 30s",
  result: tokenize("4:25 for 20min 30s", Format.Metric),
};
const marathon_in_3_40 = {
  input: "M in 3:40h",
  result: tokenize("M in 3:40h", Format.Metric),
};
const half_marathon_72_30 = {
  input: "HM in 72:30min",
  result: tokenize("HM in 72:30min", Format.Metric),
};
const five_for_distance = {
  input: "6 min/mi for 10km",
  result: tokenize("6 min/mi for 10km", Format.Metric),
};
const at_example = {
  input: "12.5 km at 3:46 min/km",
  result: tokenize("12.5 km at 3:46 min/km", Format.Metric),
};
const twelve_out_10_home = {
  input: "4:30 for 12 min in 10 min",
  result: tokenize("4:30 for 12 min in 10 min", Format.Metric),
};

const App: React.FC = () => {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState(Format.Metric);
  const [inputResult, setInputResult] = useState<Calculation | undefined>(
    undefined
  );
  const [results, setResults] = useState<Calculation[]>([]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveResult();
    }
  };

  const saveResult = () => {
    if (!inputResult || !inputResult.isOk) {
      return;
    }
    const resultsCopy = [inputResult!, ...results];
    setResults(resultsCopy);
    save("results", resultsCopy);
    setInput("");
    setInputResult(undefined);
  };

  const onKeyUp = () => {
    if (input.length === 0) {
      setInputResult(undefined);
      return;
    }
    const result = tokenize(input, format);
    setInputResult(result);
  };

  const deleteResult = (index: number) => {
    const resultsCopy = results.filter((_, i) => i !== index);
    setResults(resultsCopy);
    save("results", resultsCopy);
  };

  const selectResult = (index: number) => {
    const result = results[index];
    setInput(result.Parts.map((x) => x.toString(format)).join(" "));
    setInputResult(result);
  };

  const selectFormat = (format: Format) => {
    setFormat(format);
    save("format", format);
  };

  const renderPart = (part: Part) => {
    if (part instanceof Marathon) {
      return (
        <span className="text-blue-600">
          M<span className="text-xs">arathon</span>
        </span>
      );
    } else if (part instanceof HalfMarathon) {
      return (
        <span className="text-blue-600">
          ½M<span className="text-xs">arathon</span>
        </span>
      );
    } else if (part instanceof Distance) {
      return (
        <span className="flex items-center gap-0.5">
          <span className="text-blue-600">
            {part.renderParts(format).valueString}
          </span>
          <span className="pt-1 text-sm text-gray-500">
            {part.renderParts(format).unitString}
          </span>
        </span>
      );
    } else if (part instanceof Speed) {
      return (
        <span className="flex items-center gap-0.5">
          <span className="text-green-600">{part.speedString(format)}</span>
          <span className="flex flex-col items-center text-sm text-gray-500">
            <span className="h-5 border-b border-gray-500">
              {part.distanceUnitString(format)}
            </span>
            <span className="h-5 ">h</span>
          </span>
        </span>
      );
    } else if (part instanceof Pace) {
      return (
        <span className="flex items-center gap-0.5">
          <span className="text-green-600">{part.paceString(format)}</span>
          <span className="flex flex-col items-center text-sm text-gray-500">
            <span className="h-5 border-b border-gray-500">min</span>
            <span className="h-5 ">{part.distanceUnitString(format)}</span>
          </span>
        </span>
      );
    } else if (part instanceof Duration) {
      return (
        <div className="flex items-center gap-0.5">
          {part.getDurationParts().map(
            (part, index) =>
              part && (
                <span key={index} className="text-yellow-600">
                  {part.valueString}
                  <span className="text-sm text-gray-500">
                    {part.unitString}
                  </span>
                </span>
              )
          )}
        </div>
      );
    } else if (part instanceof Operator) {
      return (
        <span className="font-light text-black contents">
          {part.toString(format)}
        </span>
      );
    } else if (part instanceof Constant) {
      return (
        <span className="font-light text-purple-800">{part.toString()}</span>
      );
    } else {
      return (
        <span className="text-sm text-red-600">{part.toString(format)}</span>
      );
    }
  };

  const renderResult = (result: Calculation, index: number) => {
    return (
      <div
        className="flex items-center gap-2 font-mono text-lg tracking-wide group"
        onDoubleClick={() => selectResult(index)}
      >
        {result.Parts.map((part, idx) => (
          <React.Fragment key={idx}>{renderPart(part)}</React.Fragment>
        ))}
        {result.Result && (
          <>
            <span className="flex-grow border-b border-gray-300 border-dashed"></span>
            {renderPart(result.Result)}
          </>
        )}
        {index >= 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteResult(index);
            }}
            className="hidden px-2 py-1 ml-2 text-xs text-red-600 border border-transparent rounded hover:border-red-600 group-hover:inline"
          >
            Delete
          </button>
        )}
      </div>
    );
  };

  const renderExample = (example: { input: string; result: Calculation }) => {
    return (
      <div className="items-center gap-2 md:flex">
        <div className="flex items-center gap-2 my-1">
          <span className="px-2 font-mono bg-gray-200 rounded">
            {example.input}
          </span>
        </div>
        <div className="flex-grow">{renderResult(example.result, -1)}</div>
      </div>
    );
  };

  useEffect(() => {
    const results = get<Calculation[]>("results", []).map(
      (x) =>
        new Calculation(
          x.Parts.map((x) => Part.fromJSON(x)),
          x.Result ? Part.fromJSON(x.Result) : undefined
        )
    );
    setResults(results);
    const format = get<Format>("format", Format.Metric);
    setFormat(format);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col w-full h-full max-w-3xl overflow-hidden rounded-none shadow-md md:rounded-lg md:h-[90vh]">
        <div className="flex flex-col flex-grow p-6 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => onKeyDown(e)}
            onKeyUp={onKeyUp}
            autoComplete="off"
            spellCheck="false"
            className="w-full p-3 font-mono text-xl bg-gray-200 rounded focus:outline-none"
            placeholder="Enter your pace calculation"
          />
          {inputResult && (
            <div className="mt-2">{renderResult(inputResult, -1)}</div>
          )}
          <hr className="my-2" />
          <div className="flex flex-col flex-grow h-0 gap-2 overflow-auto">
            {results.map((result, index) => (
              <div key={index} onDoubleClick={() => selectResult(index)}>
                {renderResult(result, index)}
                <a
                  href="#"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteResult(index);
                  }}
                  className="hidden"
                >
                  x
                </a>
              </div>
            ))}
            <div className="mt-4">
              <p>
                <span className="font-monomaniac">run-calculator.com </span> is
                an{" "}
                <a
                  href="https://github.com/jborch/run-calculator"
                  target="_blank"
                  title="View on GitHub"
                  className="text-blue-600"
                >
                  open source
                </a>
                , simple and easy-to-use pace calculator for runners. Enter your
                calculation in the input field above and press "Enter" to save
                the result. You can double click on a previous result to copy it
                to the input field.
              </p>
              <h4 className="mt-4 font-monomaniac">Examples</h4>
              {renderExample(example_5k)}
              {renderExample(example_4_25)}
              {renderExample(marathon_in_3_40)}
              {renderExample(half_marathon_72_30)}
              {renderExample(five_for_distance)}
              {renderExample(at_example)}
              {renderExample(twelve_out_10_home)}
              <div className="grid mt-4 gap-x-1 gap-y-1 md:grid-cols-2">
                <div className="flex-1 p-3 bg-gray-100 rounded-lg">
                  <h4 className="w-full mb-2 font-bold text-center">
                    Distance
                  </h4>
                  <div className="flex justify-center">
                    <table>
                      <tbody>
                        {format === Format.Metric && (
                          <>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  m
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>meters</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  km
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>kilometers</td>
                            </tr>
                          </>
                        )}
                        {format === Format.Imperial && (
                          <>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  yd
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>yards</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  mi
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>miles</td>
                            </tr>
                          </>
                        )}
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              HM
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>Half-marathon</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              M
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>Marathon</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 space-x-1 text-sm font-gray-60">
                    <span className="font-light">Usage:</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      400m
                    </span>
                    <span className="font-light">,</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      7.5km
                    </span>
                    <span className="font-light">,</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      HM
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 bg-gray-100 rounded-lg">
                  <h4 className="w-full mb-2 font-bold text-center">
                    Duration
                  </h4>
                  <div className="flex justify-center">
                    <table>
                      <tbody>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              s
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>seconds</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              min
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>minutes</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              h
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>hours</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 space-x-1 text-sm font-gray-60">
                    <span className="font-light">Usage:</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      20min 2s
                    </span>
                    <span className="font-light">or</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      20:2 min
                    </span>
                    <span className="font-light">,</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      3h 5min
                    </span>
                    <span className="font-light">or</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      3:50 h
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 bg-gray-100 rounded-lg">
                  <h4 className="w-full mb-2 font-bold text-center">Pace</h4>
                  <div className="flex justify-center">
                    <table>
                      <tbody>
                        {format === Format.Metric && (
                          <>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  min/km
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>minutes per kilometer</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  km/h
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>kilometers per hour</td>
                            </tr>
                          </>
                        )}
                        {format === Format.Imperial && (
                          <>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  min/mi
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>minutes per mile</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-center">
                                <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                                  mi/h
                                </span>
                              </td>
                              <td className="px-1">=</td>
                              <td>miles per hour</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 space-x-1 text-sm font-gray-60">
                    <span className="font-light">Usage:</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      5:00 min/km
                    </span>
                    <span className="font-light">or just</span>
                    <span className="p-1 font-mono bg-gray-300 rounded">
                      5:00
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 bg-gray-100 rounded-lg">
                  <h4 className="w-full mb-2 font-bold text-center">
                    Operators
                  </h4>
                  <div className="flex justify-center">
                    <table>
                      <tbody>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              for
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>pace for duration/distance</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              at
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>distance/duration in at</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              in
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>distance in duration</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              *
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>multiplication</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-center">
                            <span className="px-2 py-1 font-mono bg-gray-300 rounded">
                              +
                            </span>
                          </td>
                          <td className="px-1">=</td>
                          <td>addition</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-2 text-sm font-light text-center text-white bg-slate-600">
          <div className="mb-2">
            <button
              onClick={() => selectFormat(Format.Metric)}
              className={`px-2 py-1 mr-1 text-xs rounded ${
                format === Format.Metric
                  ? "border border-white text-white"
                  : "text-gray-100"
              }`}
            >
              Metric
            </button>
            <button
              onClick={() => selectFormat(Format.Imperial)}
              className={`px-2 py-1 text-xs rounded ${
                format === Format.Imperial
                  ? "border border-white text-white"
                  : "text-gray-100"
              }`}
            >
              Imperial
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-monomaniac">run-calculator.com</span>
            <span>|</span>
            <span>&copy; {new Date().getFullYear()}</span>
            <span>|</span>
            <a
              href="https://github.com/jborch/run-calculator"
              target="_blank"
              title="View on GitHub"
            >
              <img src="github-mark-white.svg" alt="GitHub" className="h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
