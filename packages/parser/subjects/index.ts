import { readGlobFiles } from "../utils/globMatch";
import { parseSubject } from "./parse";
import { writeFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, dirname } from "path";

export async function parseSubjects(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const subjectGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/subject/*.xml"
  });

  const subjects: any[] = [];
  for (const subjectFile of subjectGlobs) {
    const data = await parseSubject(subjectFile, replacementsDirectory);

    const relativeName = "./subject/s_" + data.code + ".json";

    const name = join(outputDirectory, relativeName);
    mkdirp(dirname(name));
    writeFileSync(name, JSON.stringify(data, null, "  "));

    subjects.push({
      code: data.code,
      title: data.title,
      file: relativeName
    });
  }

  subjects.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(
    join(outputDirectory, "./subjects.json"),
    JSON.stringify(subjects, null, "  ")
  );
}
