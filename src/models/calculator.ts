export enum ResultStatus {
  None = 0,
  Ok = 1,
  ParseError = -1,
}

export enum PartType {
  Error = 0,
  Pace = 1,
  Speed = 2,
  Operator = 3,
  Duration = 4,
  Distance = 5,
  Marathon = 6,
  HalfMarathon = 7,
  Constant = 8,
}

export enum Format {
  Metric = 0,
  Imperial = 1,
}

export const Mile = 1609.34;
export const MilePerKm = 1 / 1.60934;
export const KmPerMile = 1.60934;
export const Yard = 0.9144;

export enum Unit {
  MinutesPerKilometer = "min/km",
  MinutesPerMile = "min/mi",
  KilometersPerHour = "km/h",
  MilesPerHour = "mi/h",

  /* Distance */
  Meters = "m",
  Kilometers = "km",
  Miles = "mi",
  Yards = "yd",

  /* Duration */
  Seconds = "s",
  Minutes = "min",
  Hours = "h",
}

export enum Operators {
  InOperator = "in",
  ForOperator = "for",
  AtOperator = "at",
  Multiplication = "*",
  Addition = "+",
}

export const MarathonDistanceMeters = 42195;
export const HalfMarathonDistanceMeters = MarathonDistanceMeters / 2;

export abstract class Part {
  public Type: PartType = PartType.Error;

  constructor() {}

  isPace(): boolean {
    return this.Type === PartType.Pace;
  }

  isDistance(): boolean {
    return this.Type === PartType.Distance;
  }

  isError(): boolean {
    return this.Type === PartType.Error;
  }

  isDuration(): boolean {
    return this.Type === PartType.Duration;
  }

  isOperator(): boolean {
    return this.Type === PartType.Operator;
  }

  abstract toString(format: Format): string;

  static fromJSON(x: Part): Part {
    switch (x.Type) {
      case PartType.Pace:
        return new Pace((x as Pace).SecondsPerKm);

      case PartType.Speed:
        return new Speed((x as Pace).SecondsPerKm);

      case PartType.Duration:
        return new Duration((x as Duration).Seconds);

      case PartType.Distance:
        return new Distance((x as Distance).Meters);

      case PartType.Operator:
        return new Operator((x as Operator).Operator);

      case PartType.Error:
        return new ErrorPart((x as ErrorPart).Message);

      case PartType.Constant:
        return new Constant((x as Constant).Value);

      case PartType.Marathon:
        return new Marathon();

      case PartType.HalfMarathon:
        return new HalfMarathon();

      default:
        return new ErrorPart(`Unknown type ${x.Type}`);
    }
  }
}

type MatchResult<T> = {
  part: T | null;
  remaining: string;
};

export class ErrorPart extends Part {
  public override Type: PartType = PartType.Error;

  constructor(public Message: string) {
    super();
  }

  override toString(): string {
    return this.Message;
  }
}

export class Operator extends Part {
  constructor(public Operator: Operators) {
    super();
  }

  isMultiplication() {
    return this.Operator === Operators.Multiplication;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override toString(_format: Format): string {
    return this.Operator;
  }

  public override Type: PartType = PartType.Operator;

  static Match(input: string): MatchResult<Operator> | null {
    const match = input.match(/^(\*|@|at|for|in|\+|-)/);
    if (match) {
      const part = new Operator(match[0] as Operators);
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }
    return null;
  }
}

function toSeconds(
  value1: number,
  value2: number,
  value3: number,
  unit: Unit
): number {
  switch (unit) {
    case Unit.Seconds:
      return value1;
    case Unit.Minutes:
      return value1 * 60 + value2;
    case Unit.Hours:
      return value1 * 3600 + value2 * 60 + value3;
    default:
      throw new Error(`Unknown unit ${unit}`);
  }
}

export class Duration extends Part {
  public override Type: PartType = PartType.Duration;

  constructor(public Seconds: number) {
    super();
  }

  public static Match(input: string): MatchResult<Duration> | null {
    const match2 = input.match(/^(?:(\d+)h)?(?:(\d+)min)?(?:(\d+)s)?/);

    if (match2 && match2[0]) {
      const hours = parseInt(match2[1]) || 0;
      const minutes = parseInt(match2[2]) || 0;
      const seconds = parseInt(match2[3]) || 0;

      const part = new Duration(hours * 3600 + minutes * 60 + seconds);

      return {
        part,
        remaining: input.slice(match2[0].length),
      };
    }

    const match = input.match(/^(\d+)(:\d+)?(:\d+)?(h|min|s)/);

    if (match) {
      const value1 = parseInt(match[1]);
      const value2 = match[2] ? parseInt(match[2].slice(1)) : 0;
      const value3 = match[3] ? parseInt(match[3].slice(1)) : 0;
      const unit = match[4];
      const part = new Duration(
        toSeconds(value1, value2, value3, unit as Unit)
      );
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }

    return null;
  }

  getDurationParts(): { valueString: string; unitString: string }[] {
    return getDurationParts(this.Seconds);
  }

  override toString() {
    return formatDuration(this.Seconds);
  }
}

export class Constant extends Part {
  public override Type: PartType = PartType.Constant;

  constructor(public Value: number) {
    super();
  }

  override toString() {
    return this.Value.toLocaleString("en-US");
  }

  public static Match(input: string): MatchResult<Constant> | null {
    let match = input.match(/^(\d+(?:\.\d+)?)$/);

    if (match) {
      const value = parseFloat(match[1]);
      const part = new Constant(value);
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }

    match = input.match(/^(\d+(?:\.\d+)?)(\*|@|at|for|in|\+|-)/);

    if (match) {
      const value = parseFloat(match[1]);
      const part = new Constant(value);
      return {
        part,
        remaining: input.slice(match[1].length),
      };
    }

    return null;
  }
}

export class Pace extends Part {
  public override Type: PartType = PartType.Pace;

  constructor(public SecondsPerKm: number) {
    super();
  }

  public static Match(input: string, format: Format): MatchResult<Pace> | null {
    const match = input.match(
      /^(\d+)(:\d+)?((?:min\/km)|(?:min\/mi)|h|min|s)?/
    );

    if (match) {
      if (!match[2] && !match[3]) {
        return null;
      }

      const unit =
        match[3] ||
        (format === Format.Metric
          ? Unit.MinutesPerKilometer
          : Unit.MinutesPerMile);

      if (unit !== Unit.MinutesPerKilometer && unit !== Unit.MinutesPerMile) {
        return null;
      }

      const minutes = parseInt(match[1]);
      const seconds = match[2] ? parseInt(match[2].slice(1)) : 0;

      let secondsPerKm = minutes * 60 + seconds;

      if (unit === Unit.MinutesPerMile) {
        secondsPerKm = secondsPerKm / KmPerMile;
      }

      const part = new Pace(secondsPerKm);

      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }
    return null;
  }

  distanceUnitString(format: Format): string {
    return format === Format.Imperial ? Unit.Miles : Unit.Kilometers;
  }

  unitString(format: Format): string {
    return format === Format.Imperial
      ? Unit.MinutesPerMile
      : Unit.MinutesPerKilometer;
  }

  paceString(format: Format): string {
    const secondsPerUnit =
      format === Format.Imperial
        ? this.SecondsPerKm * KmPerMile
        : this.SecondsPerKm;
    const minutes = Math.floor(secondsPerUnit / 60);
    const remainingSeconds = secondsPerUnit % 60;

    return `${minutes}:${remainingSeconds.toFixed(0).padStart(2, "0")}`;
  }

  override toString(format: Format) {
    return `${this.paceString(format)}${this.unitString(format)}`;
  }
}
export class Speed extends Pace {
  public override Type: PartType = PartType.Speed;

  public static Match(input: string): MatchResult<Speed> | null {
    const match = input.match(/^(\d+(?:\.\d+)?)((?:km\/h)|(?:mi\/h))/);

    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      const secondsPerKm =
        unit === Unit.KilometersPerHour
          ? (60 / value) * 60
          : ((60 / value) * 60) / KmPerMile;
      const part = new Speed(secondsPerKm);
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }

    return null;
  }

  distanceUnitString(format: Format): string {
    return format === Format.Imperial ? Unit.Miles : Unit.Kilometers;
  }

  unitString(format: Format): string {
    return format === Format.Imperial
      ? Unit.MilesPerHour
      : Unit.KilometersPerHour;
  }

  speedString(format: Format): string {
    const speed = format === Format.Metric ? 60 / (this.SecondsPerKm / 60) : 0;

    return speed.toLocaleString("en-US");
  }

  override toString(format: Format) {
    return `${this.speedString(format)}${this.unitString(format)}`;
  }
}

function toMeters(value: number, unit: Unit): number {
  switch (unit) {
    case Unit.Meters:
      return value;
    case Unit.Kilometers:
      return value * 1000;
    case Unit.Miles:
      return value * Mile;
    case Unit.Yards:
      return value * Yard;
    default:
      throw new Error(`Unknown unit ${unit}`);
  }
}

export class Distance extends Part {
  public override Type: PartType = PartType.Distance;

  get Yards(): number {
    return this.Meters / Yard;
  }

  constructor(public Meters: number) {
    super();
  }

  public static Match(input: string): MatchResult<Distance> | null {
    const match = input.match(/^(\d+(?:\.\d+)?)(mi?|km|yd)/);

    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      const part = new Distance(toMeters(value, unit as Unit));
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }
    return null;
  }

  renderParts(format: Format): { valueString: string; unitString: string } {
    if (format === Format.Imperial) {
      if (this.Meters < Mile) {
        return {
          valueString: Math.round(this.Meters / Yard).toLocaleString("en-US"),
          unitString: Unit.Yards,
        };
      }

      return {
        valueString: (this.Meters / Mile).toLocaleString("en-US"),
        unitString: Unit.Miles,
      };
    }

    if (this.Meters < 1000) {
      return {
        valueString: this.Meters.toLocaleString("en-US"),
        unitString: Unit.Meters,
      };
    }

    return {
      valueString: (this.Meters / 1000).toLocaleString("en-US"),
      unitString: Unit.Kilometers,
    };
  }

  override toString(format: Format) {
    const { valueString, unitString } = this.renderParts(format);
    return `${valueString}${unitString}`;
  }
}

export class Marathon extends Distance {
  public override Type: PartType = PartType.Marathon;

  constructor() {
    super(MarathonDistanceMeters);
  }

  override toString() {
    return "M";
  }

  public static Match(input: string): MatchResult<Distance> | null {
    const match = input.match(/^M/i);

    if (match) {
      const part = new Marathon();
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }
    return null;
  }
}

export class HalfMarathon extends Distance {
  public override Type: PartType = PartType.HalfMarathon;

  constructor() {
    super(HalfMarathonDistanceMeters);
  }

  override toString() {
    return "HM";
  }

  public static Match(input: string): MatchResult<Distance> | null {
    const match = input.match(/^HM/i);

    if (match) {
      const part = new HalfMarathon();
      return {
        part,
        remaining: input.slice(match[0].length),
      };
    }
    return null;
  }
}

export class Calculation {
  constructor(public Parts: Part[], public Result?: Part) {}

  get isOk(): boolean {
    return !!(this.Result && this.Result.Type !== PartType.Error);
  }

  get isError(): boolean {
    return !this.isOk;
  }
}

function match(input: string, format: Format): MatchResult<Part> {
  let match: MatchResult<Part> | null;
  if ((match = Pace.Match(input, format))) {
    return match;
  }
  if ((match = Speed.Match(input))) {
    return match;
  }
  if ((match = Duration.Match(input))) {
    return match;
  }
  if ((match = Operator.Match(input))) {
    return match;
  }
  if ((match = Distance.Match(input))) {
    return match;
  }
  if ((match = Marathon.Match(input))) {
    return match;
  }
  if ((match = HalfMarathon.Match(input))) {
    return match;
  }
  if ((match = Constant.Match(input))) {
    return match;
  }
  return {
    part: null,
    remaining: input,
  };
}

function distanceAtPace(distance: Distance, pace: Pace): Duration {
  return new Duration(Math.round(pace.SecondsPerKm * (distance.Meters / 1000)));
}

function durationAtPace(Duration: Duration, Pace: Pace): Distance {
  return new Distance((Duration.Seconds / Pace.SecondsPerKm) * 1000);
}

function distanceInDuration(Distance: Distance, Duration: Duration): Pace {
  return new Pace(Duration.Seconds / (Distance.Meters / 1000));
}

function operation(left: Part, operator: Operator, right: Part): Part {
  if (
    left instanceof Pace &&
    operator.Operator === Operators.ForOperator &&
    right instanceof Duration
  ) {
    return durationAtPace(right, left);
  }

  if (
    left instanceof Distance &&
    operator.Operator === Operators.AtOperator &&
    right instanceof Pace
  ) {
    return distanceAtPace(left, right);
  }

  if (
    left instanceof Duration &&
    operator.Operator === Operators.AtOperator &&
    right instanceof Pace
  ) {
    return durationAtPace(left, right);
  }

  if (
    left instanceof Pace &&
    operator.Operator === Operators.ForOperator &&
    right instanceof Distance
  ) {
    return distanceAtPace(right, left);
  }

  if (
    left instanceof Distance &&
    operator.Operator === Operators.InOperator &&
    right instanceof Duration
  ) {
    return distanceInDuration(left, right);
  }

  if (
    left instanceof Distance &&
    operator.Operator === Operators.Multiplication &&
    right instanceof Constant
  ) {
    return new Distance(left.Meters * right.Value);
  }

  if (
    left instanceof Constant &&
    operator.Operator === Operators.Multiplication &&
    right instanceof Distance
  ) {
    return new Distance(left.Value * right.Meters);
  }

  if (
    left instanceof Duration &&
    operator.Operator === Operators.Multiplication &&
    right instanceof Constant
  ) {
    return new Duration(left.Seconds * right.Value);
  }

  if (
    left instanceof Constant &&
    operator.Operator === Operators.Multiplication &&
    right instanceof Duration
  ) {
    return new Duration(left.Value * right.Seconds);
  }

  if (
    left instanceof Distance &&
    operator.Operator === Operators.Addition &&
    right instanceof Distance
  ) {
    return new Distance(left.Meters + right.Meters);
  }

  if (
    left instanceof Duration &&
    operator.Operator === Operators.Addition &&
    right instanceof Duration
  ) {
    return new Distance(left.Seconds + right.Seconds);
  }

  if (
    left instanceof Constant &&
    operator.Operator === Operators.Addition &&
    right instanceof Constant
  ) {
    return new Constant(left.Value + right.Value);
  }

  if (
    left instanceof Constant &&
    operator.Operator === Operators.Multiplication &&
    right instanceof Constant
  ) {
    return new Constant(left.Value * right.Value);
  }

  return new ErrorPart("Unknown operation");
}

function calculate(parts: Part[]): Part | undefined {
  if (parts.length == 1 && parts[0] instanceof Speed) {
    return new Pace(parts[0].SecondsPerKm);
  }

  if (parts.length == 1 && parts[0] instanceof Pace) {
    return new Speed(parts[0].SecondsPerKm);
  }

  if (parts.length < 3) {
    return undefined;
  }

  let partsCopy = [...parts];

  while (partsCopy.length > 1) {
    const indexes = partsCopy
      .map((part, index) => (part instanceof Operator ? { index, part } : null))
      .filter((x) => x !== null);

    if (indexes.length === 0) {
      return new ErrorPart("Invalid operation");
    }

    const nextOperator =
      indexes.find(
        (x) =>
          x.part.Operator === Operators.ForOperator ||
          x.part.Operator === Operators.AtOperator ||
          x.part.Operator === Operators.InOperator
      ) ||
      indexes.find((x) => x.part.Operator === Operators.Multiplication) ||
      indexes[0];

    const left = partsCopy[nextOperator.index - 1];

    if (!left) {
      return new ErrorPart("Invalid operation");
    }

    const operator = nextOperator.part;

    const right = partsCopy[nextOperator.index + 1];

    if (!right) {
      return new ErrorPart("Invalid operation");
    }

    const result = operation(left, operator, right);

    partsCopy = [
      ...partsCopy.slice(0, nextOperator.index - 1),
      result,
      ...partsCopy.slice(nextOperator.index + 2),
    ];
  }

  return partsCopy[0];
}

// Function to map raw tokens into CalculateParts
export function tokenize(input: string, format: Format): Calculation {
  const sanitizedInput = input.replace(/\s+/g, "");
  const calculateParts: Part[] = [];

  let remainingInput = sanitizedInput;

  while (remainingInput.length > 0) {
    const { part, remaining } = match(remainingInput, format);

    if (!part) {
      calculateParts.push(new ErrorPart(remaining));
      return new Calculation(calculateParts);
    }

    calculateParts.push(part);
    remainingInput = remaining;
  }

  return new Calculation(calculateParts, calculate(calculateParts));
}

function getDurationParts(
  totalSeconds: number
): { valueString: string; unitString: string }[] {
  const parts: { valueString: string; unitString: string }[] = [];

  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    parts.push({ valueString: hours.toString(), unitString: Unit.Hours });
  }

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (minutes > 0) {
    parts.push({ valueString: minutes.toString(), unitString: Unit.Minutes });
  }

  const seconds = Math.round(totalSeconds) % 60;
  if (seconds > 0) {
    parts.push({ valueString: seconds.toString(), unitString: Unit.Seconds });
  }

  return parts;
}

function formatDuration(totalSeconds: number): string {
  const parts: string[] = getDurationParts(totalSeconds).map(
    (part) => `${part.valueString}${part.unitString}`
  );

  return parts.join(" ");
}
