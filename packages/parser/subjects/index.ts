import { readGlobFiles } from "../utils/globMatch";
import { parseSubject } from "./parse";
import { writeFileSync, readFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, dirname } from "path";
import { parseXML } from "../utils/parseXml";
import { getSortableCode } from "../utils/sortableCode";
import { rethrowErrorsWithContext } from "../utils/wrapErr";

export async function parseSubjects(
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const subjectsMap = new Map<string, any>();

  const subjectGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/subject/*.xml",
  });

  const subjects: any[] = [];
  for (const subjectFile of subjectGlobs) {
    await rethrowErrorsWithContext(subjectFile, async () => {
      const str = readFileSync(subjectFile, "utf-8");
      const rawData = await parseXML(str);

      const data = await parseSubject(rawData.subject, replacementsDirectory);

      const relativeName = "./subject/s_" + data.code + ".json";

      const name = join(outputDirectory, relativeName);
      mkdirp(dirname(name));
      writeFileSync(name, JSON.stringify(data, null, "  "));

      subjects.push({
        code: data.code,
        title: data.title,
        file: relativeName,
      });
      subjectsMap.set(data.code, data);
    });
  }

  subjects.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );
  writeFileSync(
    join(outputDirectory, "./subjects.json"),
    JSON.stringify(subjects, null, "  ")
  );

  return subjectsMap;
}
