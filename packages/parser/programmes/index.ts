import { readGlobFiles } from "../utils/globMatch";
import { parseProgram } from "./parse";
import { writeFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, relative, dirname } from "path";

export async function parseProgrammes(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const programGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/program/*.xml"
  });

  const programmes: any[] = [];
  for (const programFile of programGlobs) {
    const data = await parseProgram(programFile, replacementsDirectory);

    const relativeName = "./program/" + data.code + ".json";

    const name = join(outputDirectory, relativeName);
    mkdirp(dirname(name));
    writeFileSync(name, JSON.stringify(data, null, "  "));

    programmes.push({
      code: data.code,
      title: data.title,
      file: relativeName
    });
  }

  programmes.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(
    join(outputDirectory, "./programmes.json"),
    JSON.stringify(programmes, null, "  ")
  );
}
