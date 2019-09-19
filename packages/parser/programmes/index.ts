import { readGlobFiles } from "../utils/globMatch";
import { parseProgram } from "./parse";
import { writeFileSync } from "fs";
import { join } from "path";

export async function parseProgrammes(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  const programGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/program/*.xml"
  });

  const programmes: any[] = [];
  for (const programFile of programGlobs) {
    const data = await parseProgram(programFile, replacementsDirectory);

    writeFileSync(
      join(outputDirectory, data.code + ".json"),
      JSON.stringify(data, null, "  ")
    );

    programmes.push({
      code: data.code,
      title: data.title,
      file: "./out/" + data.code + ".json"
    });
  }

  programmes.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(
    join(outputDirectory, "./programmes.json"),
    JSON.stringify(programmes, null, "  ")
  );
}
