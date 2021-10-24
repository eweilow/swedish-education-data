import { readGlobFiles } from "../utils/globMatch";
import { parseProgram } from "./parse";
import { writeFileSync, readFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, relative, dirname } from "path";
import { parseXML } from "../utils/parseXml";
import { getSortableCode } from "../utils/sortableCode";
import { rethrowErrorsWithContext } from "../utils/wrapErr";

export async function parseProgrammes(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const programmesMap = new Map<string, any>();

  const programGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/program/*.xml",
  });

  const programmes: any[] = [];
  for (const programFile of programGlobs) {
    if (programFile.includes("parallel")) continue;

    await rethrowErrorsWithContext(programFile, async () => {
      const str = readFileSync(programFile, "utf-8");
      const rawData = await parseXML(str);

      if (rawData.program.typeOfProgram?.[0] == null) {
        throw new Error("rawData.program.typeOfProgram == null");
      }
      if (
        !(
          rawData.program.typeOfProgram?.[0] ===
            "PRELIMINARY_PROGRAM_FOR_HIGHER_EDUCATION" ||
          rawData.program.typeOfProgram?.[0] === "VOCATIONAL_PROGRAM"
        )
      ) {
        console.log(`Ignoring ${programFile}`);
        return;
      }

      const data = await parseProgram(rawData.program, replacementsDirectory);

      const relativeName = "./program/p_" + data.code + ".json";

      const name = join(outputDirectory, relativeName);
      mkdirp(dirname(name));
      writeFileSync(name, JSON.stringify(data, null, "  "));

      programmes.push({
        code: data.code,
        title: data.title,
        file: relativeName,
      });
      programmesMap.set(data.code, data);
    });
  }

  programmes.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );
  writeFileSync(
    join(outputDirectory, "./programmes.json"),
    JSON.stringify(programmes, null, "  ")
  );

  return programmesMap;
}
