import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { getSortableCode, getSortedCodes, normalizeCode } from "../utils/code";

function removeNumberingFromRows(rows: any[]) {
  return rows?.map((row) => row.replace(/^\d+\. /, ""));
}

let allCourses: any[];

function readCourses(inputDirectory: string) {
  if (allCourses != null) return allCourses;

  allCourses = [];
  for (const file of glob.sync("courses/**/*.json", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    allCourses.push(JSON.parse(readFileSync(file, "utf-8")));
  }

  return allCourses;
}

export async function parseSubjects(
  inputDirectory: string,
  outputDirectory: string
) {
  const subjectsDir = join(outputDirectory, "./subject");
  mkdirp.sync(subjectsDir);

  const subjects: any[] = [];

  for (const file of glob.sync("subjects/**/*.json", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    const contents = JSON.parse(readFileSync(file, "utf-8"));

    const purposes = contents.purpose.sections.find(
      (section: any) => section.title == null
    )?.rows;

    const developmentPurposes = contents.purpose.sections.find((section: any) =>
      section.title?.startsWith("Undervisningen i ämnet")
    )?.rows;

    const coursesInfo =
      contents.purpose.sections.find((section: any) =>
        section.title?.startsWith("Kurser i ämnet")
      )?.rows ?? [];

    const allCourseData = readCourses(inputDirectory);

    const courseInfo = {};
    for (const row of removeNumberingFromRows(coursesInfo)) {
      const [courseName] = row.split("poäng, ");

      const identifiedCourse = allCourseData.find((el) =>
        courseName.toLowerCase().includes(el.name.toLowerCase() + ", ")
      );
      courseInfo[identifiedCourse.code] = row;
    }

    const courseCodes = getSortedCodes(Object.keys(courseInfo));
    const sortedInfos = {};
    for (const courseCode of courseCodes) {
      sortedInfos[courseCode] = courseInfo[courseCode];
    }

    const result = {
      title: contents.name,
      code: contents.code,
      developmentPurposes: removeNumberingFromRows(developmentPurposes),
      purposes: removeNumberingFromRows(purposes),
      courseInfo: sortedInfos,
      description: contents.description[0],
      typeOfSchooling: contents.typeOfSchooling,
      applicableFrom: contents.createdDate,
      modifiedDate: contents.modifiedDate,
      courses: courseCodes,
    };

    const name = `s_${normalizeCode(result.code)}.json`;
    writeFileSync(join(subjectsDir, name), JSON.stringify(result, null, "  "));

    subjects.push({
      code: result.code,
      title: result.title,
      file: "./subject/" + name,
    });
  }

  subjects.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );
  writeFileSync(
    join(outputDirectory, "./subjects.json"),
    JSON.stringify(subjects, null, "  ")
  );
}
