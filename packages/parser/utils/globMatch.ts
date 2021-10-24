import * as glob from "glob";
import { join } from "path";

type Input = {
  directory: string;
  globStr: string;
};

export async function readGlobFiles(...array: Input[]): Promise<string[]> {
  let globPromises: Promise<string[]>[] = [];
  for (let { directory, globStr } of array) {
    globPromises.push(
      new Promise<string[]>((resolve, reject) => {
        glob(globStr, { cwd: directory, root: directory }, (err, files) => {
          if (err) return reject(err);

          resolve(files.map((file) => join(directory, file)));
        });
      })
    );
  }
  return Promise.all(globPromises).then((arr) =>
    ([] as string[]).concat(...arr)
  );
}
