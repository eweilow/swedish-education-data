import { normalizeHTML } from "../utils/normalizeHtml";

import { assert } from "chai";

import * as $ from "cheerio";
import { getReplacements } from "../replacement";
import { join } from "path";
import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";
import { getSortableCode } from "../utils/sortableCode";

export async function parseSubject(data: any, replacementsDirectory: string) {
  if (!/^\<p\>.*?\<\/p\>$/.test(data.description[0])) {
    console.warn(`subject ${data.code[0].trim()} has malformed description`);
  }

  const subject = {
    title: data.name[0].trim(),
    code: data.code[0].trim(),
    developmentPurposes: [] as any[],
    purposes: [] as any[],
    courseInfo: {} as any,
    description: $("<div>" + normalizeHTML(data.description[0]) + "</div>")
      .text()
      .replace(/(\s|\n)+/gm, " ")
      .trim(),
    typeOfSchooling: data.typeOfSchooling[0].trim(),
    category: data.category[0].trim(),
    applicableFrom: new Date(data.applianceDate[0]).toISOString(),
    courses: data.courses.map((el: any) => el.code[0].trim())
  };

  subject.courses.sort((a: any, b: any) =>
    getSortableCode(a).localeCompare(getSortableCode(b))
  );

  const manualReplacements = await getReplacements(
    join(replacementsDirectory, "./subject", "s_" + subject.code + ".json")
  );

  let purpose = normalizeHTML(data.purpose[0]).split("\n");
  setValueIfExists(
    manualReplacements["purpose"],
    value =>
      checkTextEquality(
        purpose.join("\n"),
        value.join("\n"),
        manualReplacements.allowedPurposeDifference != null
          ? manualReplacements.allowedPurposeDifference.join("\n")
          : null
      ),
    value => {
      purpose = normalizeHTML(value.join("\n")).split("\n");
    }
  );

  const parsedPurpose = $("<div>" + purpose.join("\n") + "</div>");
  const developmentPurposes = parsedPurpose
    .find("h4 + ol") // Matching on h4 is SO risky lol
    .first()
    .children()
    .toArray()
    .map(el =>
      $(el)
        .text()
        .trim()
        .replace(/^[0-9]+\. /, "")
        .replace(/(\s|\n)+/gm, " ")
        .trim()
    )
    .map(el => el[0].toUpperCase() + el.slice(1));

  assert.isAtLeast(
    developmentPurposes.length,
    1,
    "There should be at least one development purpose in subject " +
      subject.code +
      ":\n | " +
      purpose.join("\n | ")
  );

  subject.developmentPurposes = developmentPurposes;

  const purposes = parsedPurpose
    .find("p:not(h4 ~ p)") // Matching on h4 is SO risky lol
    .toArray()
    .map(el =>
      $(el)
        .text()
        .trim()
        .replace(/^[0-9]+\. /, "")
        .replace(/(\s|\n)+/gm, " ")
        .trim()
    );
  assert.isAtLeast(
    purposes.length,
    1,
    "There should be at least one purpose in subject " +
      subject.code +
      ":\n | " +
      purpose.join("\n | ")
  );

  subject.purposes = purposes;

  const courseInfo = parsedPurpose
    .find("h3 + ol, h3 + ul") // Matching on h4 is SO risky lol
    .first()
    .children()
    .toArray()
    .map(el =>
      $(el)
        .text()
        .trim()
        .replace(/^[0-9]+\. /, "")
        .replace(/(\s|\n)+/gm, " ")
        .trim()
    );

  assert.isAtLeast(
    courseInfo.length,
    1,
    "There should be at least one courseInfo in subject " +
      subject.code +
      ":\n | " +
      purpose.join("\n | ")
  );

  function longestStartString(a: string, b: string) {
    if (!b.startsWith(a)) {
      return -1;
    }

    let i = 0;
    for (; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        break;
      }
    }
    return i;
  }

  const matchMatrix: number[][] = [];
  const matchMatrixWidth = courseInfo.length;
  const matchMatrixHeight = data.courses.length;

  for (const course of data.courses) {
    matchMatrix.push(
      courseInfo.map((el: any) =>
        longestStartString(course.name[0].trim(), el.trim())
      )
    );
  }

  const printDebug = false;

  const picked = new Set<string>();
  if (printDebug) {
    console.log({
      rows: data.courses.map((el: any) => el.name[0]),
      columns: courseInfo
    });
  }
  if (printDebug) {
    console.log(matchMatrix);
  }
  for (let column = 0; column < matchMatrixWidth; column++) {
    if (printDebug) {
      console.log(`\n\n${courseInfo[column]}:`);
    }

    let best = -1;
    let str: string | null = null;
    for (let row = 0; row < matchMatrixHeight; row++) {
      if (matchMatrix[row][column] > best) {
        best = matchMatrix[row][column];
        str = data.courses[row].code[0].trim();
      }
      if (
        !picked.has(data.courses[row].code[0].trim()) &&
        matchMatrix[row][column] >= 0
      ) {
        if (printDebug) {
          console.log(
            `${matchMatrix[row][column]}: '${
              data.courses[row].name[0]
            }', ${data.courses[row].code[0].trim()}`
          );
        }
      }
    }
    if (str != null) {
      picked.add(str);
      subject.courseInfo[str.trim()] = courseInfo[column];
    }
  }

  for (const code of subject.courses) {
    if (!subject.courseInfo[code]) {
      console.warn(
        `warning: Course ${code} is missing info in subject ${subject.code}. Auto-generating`
      );
      const found = (data.courses as any[]).find(
        el => code === el.code[0].trim()
      );
      // if (subject.code === "IDR") {
      //   console.log(found);
      // }
      subject.courseInfo[code] = `${found.name[0]}, ${found.point[0]} poäng.`;
    }
  }

  return subject;
}
