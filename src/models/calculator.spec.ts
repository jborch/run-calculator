import { describe, expect, test } from "vitest";

import {
  Calculation,
  Pace,
  Operator,
  Duration,
  Distance,
  tokenize,
  Operators,
  Format,
  KmPerMile,
} from "./calculator";

describe("PacePart", () => {
  test("Match pace 04:05", () => {
    const result = Pace.Match("04:05", Format.Metric);

    expect(result?.part?.SecondsPerKm).toEqual(4 * 60 + 5);
  });

  test("Match pace 04:05", () => {
    const result = Pace.Match("04:05", Format.Imperial);

    expect(result?.part?.SecondsPerKm).toEqual((4 * 60 + 5) / KmPerMile);
  });

  test("Match pace 4:00 min/km", () => {
    const result = Pace.Match("4:01 min/km", Format.Metric);

    expect(result?.part?.SecondsPerKm).toEqual(4 * 60 + 1);
  });
});

describe("PacePart", () => {
  test("Match duration part", () => {
    const result = Duration.Match("4min");

    expect(result?.part?.Seconds).toEqual(4 * 60);
  });
});

describe("Calculator", () => {
  test(`Should not parse 'test'`, () => {
    const result = tokenize("test", Format.Metric);

    expect(result).toBeInstanceOf(Calculation);
    expect(result.isOk).toBeFalsy();
    expect(result.isError).toBeTruthy();
  });

  const variants = ["4:00 for 4min", "4:00 for4min", " 4:00  for  4min "];

  variants.forEach((variant) => {
    test("Strip whitespace from: " + variant, () => {
      const result = tokenize(variant, Format.Metric);

      expect(result).toBeInstanceOf(Calculation);
      expect(result.isOk).toBeTruthy();
      expect(result.Parts.length).toBe(3);
      expect(result.Parts[0].toString(Format.Metric)).toBe("4:00min/km");
      expect(result.Parts[1].toString(Format.Metric)).toBe("for");
      expect(result.Parts[2].toString(Format.Metric)).toBe("4min");
    });
  });

  const tests = [
    {
      input: "4:00 for 4min",
      isOk: true,
      expectedParts: [
        new Pace(4 * 60),
        new Operator(Operators.ForOperator),
        new Duration(4 * 60),
      ],
      expectedResult: new Distance(1000),
    },
    {
      input: "4 km at 3:00",
      isOk: true,
      expectedParts: [
        new Distance(4000),
        new Operator(Operators.AtOperator),
        new Pace(3 * 60),
      ],
      expectedResult: new Duration(12 * 60),
    },
    {
      input: "5 km in 20min",
      isOk: true,
      expectedParts: [
        new Distance(5000),
        new Operator(Operators.InOperator),
        new Duration(20 * 60),
      ],
      expectedResult: new Pace(60 * 4),
    },
  ];

  tests.forEach((variant) => {
    test("Should parse: " + variant.input, () => {
      const result = tokenize(variant.input, Format.Metric);

      expect(result).toBeInstanceOf(Calculation);
      expect(result.isOk).toEqual(variant.isOk);
      expect(JSON.stringify(result.Parts)).toEqual(
        JSON.stringify(variant.expectedParts)
      );

      if (variant.expectedResult) {
        expect(JSON.stringify(result.Result)).toEqual(
          JSON.stringify(variant.expectedResult)
        );
      }
    });
  });

  const testCases = [
    { input: "4:00 for 10min", expected: "2.5km" },
    { input: "5km at 5:00", expected: "25min" },
    { input: "5km in 20min", expected: "4:00min/km" },
    { input: "5km in 19min", expected: "3:48min/km" },
    { input: "4:00 for 2min", expected: "500m" },
    { input: "4:00 for 2min + 5:00 for 5min", expected: "1.5km" },
    { input: "4:44 for 20km", expected: "1h 34min 40s" },

    { input: "15km/h for 10km", expected: "40min" },
    { input: "15mi/h for 10mi", expected: "40min" },

    { input: "M in 3h", expected: "4:16min/km" },
    { input: "HM in 3h", expected: "8:32min/km" },
    { input: "HM in 1:30h", expected: "4:16min/km" },
    { input: "HM in 1h 30min", expected: "4:16min/km" },

    { input: "1.5 km at 10:00", expected: "15min" },

    { input: "5km * 2", expected: "10km" },
    { input: "2 * 5km", expected: "10km" },
    { input: "5km * 2 + 5km", expected: "15km" },

    { input: "5min * 2", expected: "10min" },

    { input: "15km/h", expected: "4:00min/km" },

    { input: "4:00min/mi for 4min", expected: "1mi", useMiles: true },
    { input: "6 min/mi for 6min", expected: "1mi", useMiles: true },
  ];

  testCases.forEach(({ input, expected, useMiles }) => {
    test(`should calculate result for "${input}"`, () => {
      const result = tokenize(input, Format.Metric);

      expect(result.isOk, JSON.stringify(result)).toBeTruthy();
      expect(
        result.Result?.toString(useMiles ? Format.Imperial : Format.Metric),
        input + JSON.stringify(result)
      ).toBe(expected);
    });
  });
});
