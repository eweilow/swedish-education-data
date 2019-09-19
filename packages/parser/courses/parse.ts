import { normalizeHTML } from "../utils/normalizeHtml";

import * as $ from "cheerio";
import { getReplacements } from "../replacement";
import { join } from "path";
import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";
import {
  readRangeFromDescription,
  getIndicesFromRange
} from "./readRangeFromDescription";

function fixDescriptionParagraph(str: string) {
  return str.replace("<i>.</i>", ".").replace("<strong>–</strong>", "–");
}
function fixDoubleParagraphs(str: string) {
  return str.replace("<p><p>", "<p>").replace("</p></p>", "</p>");
}
export async function parseCourse(
  subject: any,
  data: any,
  replacementsDirectory: string
) {
  const manualReplacements = await getReplacements(
    join(replacementsDirectory, "./course", "c_" + data.code[0] + ".json")
  );

  setValueIfExists(
    manualReplacements["description"],
    value => checkTextEquality(data.description.join("\n"), value.join("\n")),
    value => {
      data.description = [normalizeHTML(value.join("\n"))];
    }
  );

  if (
    !/^\<p\>[^<]*\<\/p\>$/.test(data.description[0]) ||
    /<p\><p\>/.test(data.description[0])
  ) {
    console.warn(
      `warning: course ${data.code[0]} has malformed description: '${data.description[0]}'`
    );
  }

  const course = {
    subject: subject.code,
    title: data.name[0].trim(),
    code: data.code[0].trim(),
    points: parseInt(data.point[0], 10),
    // This is basically unsafe to use, because it's really inconsistent
    UNSAFE_description: $(
      "<div>" +
        normalizeHTML(
          fixDescriptionParagraph(fixDoubleParagraphs(data.description[0]))
        ) +
        "</div>"
    )
      .text()
      .replace(/(\s|\n)+/gm, " ")
      .trim(),
    applicableSubjectPurposes: [] as number[]
    //data
  };

  course.applicableSubjectPurposes = getIndicesFromRange(
    readRangeFromDescription(course.UNSAFE_description),
    subject.developmentPurposes.length
  );

  if (
    Math.max(...course.applicableSubjectPurposes) + 1 >
    subject.developmentPurposes.length
  ) {
    console.warn(
      "warning: There should not be an index outside the range of subject.purposes in course " +
        course.code +
        "(found indices " +
        course.applicableSubjectPurposes.map(el => el + 1).join(", ") +
        " on range 1-" +
        subject.developmentPurposes.length +
        ")"
    );

    course.applicableSubjectPurposes = course.applicableSubjectPurposes.filter(
      el => el < subject.developmentPurposes.length
    );
  }

  return course;
}
