import { readGlobFiles } from "../utils/globMatch";
import { parseCourse } from "./parse";
import { writeFileSync, readFileSync } from "fs";
import { sync as mkdirp } from "mkdirp";
import { join, dirname } from "path";
import { parseXML } from "../utils/parseXml";
import { getSortableCode } from "../utils/sortableCode";

export async function parseCourses(
  subjects: Map<string, any>,
  sourceDirectory: string,
  outputDirectory: string,
  replacementsDirectory: string
) {
  mkdirp(outputDirectory);

  const coursesMap = new Map<string, any>();

  const subjectGlobs = await readGlobFiles({
    directory: sourceDirectory,
    globStr: "**/subject/*.xml"
  });

  const courses: any[] = [];
  for (const subjectFile of subjectGlobs) {
    const str = readFileSync(subjectFile, "utf-8");
    const rawData = await parseXML(str);

    for (const course of rawData.subject.courses) {
      const data = await parseCourse(
        subjects.get(rawData.subject.code[0])!,
        course,
        replacementsDirectory
      );

      const relativeName = "./course/c_" + data.code + ".json";

      const name = join(outputDirectory, relativeName);
      mkdirp(dirname(name));
      writeFileSync(name, JSON.stringify(data, null, "  "));

      courses.push({
        code: data.code,
        title: data.title,
        file: relativeName
      });
      coursesMap.set(data.code, data);
    }
  }

  courses.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );
  writeFileSync(
    join(outputDirectory, "./courses.json"),
    JSON.stringify(courses, null, "  ")
  );

  return coursesMap;
}
