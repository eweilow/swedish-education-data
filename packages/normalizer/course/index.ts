import { readFileSync, writeFileSync } from "fs";
import { parseXML, pickOnlyIf } from "../utils/xml";

import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";

import { getMarkdownFromHtml } from "../utils/markdown";
import { assert } from "chai";
import { normalizeCode } from "../utils/code";

export async function normalizeCourses(
  inputDirectory: string,
  outputDirectory: string
) {
  const coursesDir = join(outputDirectory, "./courses");
  mkdirp.sync(coursesDir);

  for (const file of glob.sync("gyP4_0_S3_0/subject/*.xml", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    const contents = readFileSync(file, "utf-8");

    const subjectData = await parseXML(contents);
    const { subject } = subjectData;

    for (const course of subject.courses) {
      const result = {
        name: pickOnlyIf.string(course.name?.[0]),
        code: pickOnlyIf.string(course.code?.[0]),
      };

      assert.isNotNull(result.name);
      assert.isNotNull(result.code);

      writeFileSync(
        join(coursesDir, `c_${normalizeCode(result.code)}.json`),
        JSON.stringify(result, null, "  ")
      );
    }
  }
}
