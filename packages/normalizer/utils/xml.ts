import { parseString } from "xml2js";

export function pickOnlyIf<T = any>(
  value: any,
  condition: (v: any) => boolean
): T | null {
  if (condition(value)) return value as T;

  return null;
}

pickOnlyIf.string = (value: any) =>
  pickOnlyIf<string>(value, (v) => typeof v === "string");

pickOnlyIf.number = (value: any) =>
  pickOnlyIf<number>(value, (v) => typeof v === "number");

pickOnlyIf.boolean = (value: any) =>
  pickOnlyIf<boolean>(value, (v) => typeof v === "boolean");

pickOnlyIf.oneOf = <T>(value: any, ...oneOf: T[]) =>
  pickOnlyIf<T>(value, (v) => oneOf.includes(v));

export function parseXML<T = any>(str: string) {
  return new Promise<T>((resolve, reject) => {
    parseString(
      str,
      { explicitArray: true, normalize: true, normalizeTags: true },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}
