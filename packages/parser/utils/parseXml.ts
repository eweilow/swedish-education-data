import { parseString } from "xml2js";

export function parseXML<T = any>(str: string) {
  return new Promise<T>((resolve, reject) => {
    parseString(str, { explicitArray: true }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
