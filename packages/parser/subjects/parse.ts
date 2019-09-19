import { readFileSync } from "fs";
import { parseXML } from "../utils/parseXml";
import { normalizeHTML } from "../utils/normalizeHtml";

import { assert } from "chai";

import * as $ from "cheerio";
import { getReplacements } from "../replacement";
import { join } from "path";
import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";

export async function parseSubject(
  name: string,
  replacementsDirectory: string
) {
  const str = readFileSync(name, "utf-8");
  const rawData = await parseXML(str);
  const data = rawData.subject;

  if (!/^\<p\>.*?\<\/p\>$/.test(data.description[0])) {
    console.warn(`subject ${data.code[0]} has malformed description`);
  }

  const subject = {
    title: data.name[0],
    code: data.code[0],
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
    courses: data.courses.map((el: any) => el.code[0])
  };

  const manualReplacements = await getReplacements(
    join(replacementsDirectory, "./subject", subject.code + ".json")
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
    );

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

  for (const row of courseInfo) {
    const anyFound = (data.courses as any[]).find(el =>
      row.startsWith(el.name[0])
    );

    assert.isTrue(
      anyFound != null,
      "No courses found in subject " +
        subject.code +
        " as a match for the row: '" +
        row +
        "'"
    );
    subject.courseInfo[anyFound.code[0]] = row;
  }

  for (const code of subject.courses) {
    if (!subject.courseInfo[code]) {
      console.warn(
        `warning: Course ${code} is missing info in subject ${subject.code}. Auto-generating`
      );
      const found = (data.courses as any[]).find(el => code === el.code[0]);
      subject.courseInfo[code] = `${found.name[0]}, ${found.point[0]} poäng.`;
    }
  }

  return subject;
}
