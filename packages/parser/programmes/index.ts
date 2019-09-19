import { readGlobFiles } from "../utils/globMatch";
import { parseProgram } from "./parse";
import { writeFileSync, readFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, relative, dirname } from "path";
import { parseXML } from "../utils/parseXml";

export async function parseProgrammes(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const programmesMap = new Map<string, any>();

  const programGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/program/*.xml"
  });

  const programmes: any[] = [];
  for (const programFile of programGlobs) {
    const str = readFileSync(programFile, "utf-8");
    const rawData = await parseXML(str);

    const data = await parseProgram(rawData.program, replacementsDirectory);

    const relativeName = "./program/p_" + data.code + ".json";

    const name = join(outputDirectory, relativeName);
    mkdirp(dirname(name));
    writeFileSync(name, JSON.stringify(data, null, "  "));

    programmes.push({
      code: data.code,
      title: data.title,
      file: relativeName
    });
    programmesMap.set(data.code, data);
  }

  programmes.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(
    join(outputDirectory, "./programmes.json"),
    JSON.stringify(programmes, null, "  ")
  );

  return programmesMap;
}
