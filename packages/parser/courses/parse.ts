import { normalizeHTML } from "../utils/normalizeHtml";

import * as $ from "cheerio";
import { getReplacements } from "../replacement";
import { join, dirname } from "path";
import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";
import {
  readRangeFromDescription,
  getIndicesFromRange,
} from "./readRangeFromDescription";
import { existsSync, writeFileSync } from "fs";
import * as mkdirp from "mkdirp";

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
    join(
      replacementsDirectory,
      "./course",
      "c_" + data.code[0].trim() + ".json"
    )
  );

  setValueIfExists(
    manualReplacements["description"],
    (value) => checkTextEquality(data.description.join("\n"), value.join("\n")),
    (value) => {
      data.description = [normalizeHTML(value.join("\n"))];
    }
  );

  if (
    !/^\<p\>[^<]*\<\/p\>$/.test(data.description[0]) ||
    /<p\><p\>/.test(data.description[0])
  ) {
    console.warn(
      `warning: course ${data.code[0].trim()} has malformed description: '${
        data.description[0]
      }'`
    );
  }

  const reqs = data.knowledgeRequirements.map((el) => ({
    step: el.gradeStep[0],
    text: el.text[0],
  }));

  const out = {};
  for (const req of reqs) {
    if (req.step === "D" || req.step === "B") {
      continue;
    }
    if (
      !/^\<h4\>[^<]+\<\/h4\>\s*(<div>\s*)*(?:\s*<p>(.+?)<\/p>)+(\s*<\/div>)*$/.test(
        req.text
      )
    ) {
      console.log(data.code[0].trim() + " - " + req.step + ": \n" + req.text);
    }
    out[req.step] = [...req.text.matchAll(/<p>(.+?)<\/p>/g)]
      .map((el) => el[1])
      .filter((el) => el && el.trim())
      .map((el) =>
        el
          .replace(/<br\s*\/?>/g, " ")
          .replace(/<italic>\s*\.\s*<\/italic>/g, ".")
          .replace(/\.\s*<\/strong>/g, "</strong>. ")
          .split(".")
          .filter((el) => !!el)
          .map((el) =>
            el
              .trim()
              .replace(/<br\s*\/>/g, " ")
              .replace(/<strong>\s+/g, " <strong>")
              .replace(/\s+<strong>/g, " <strong>")
              .replace(/ <\/strong>/g, "</strong> ")
              .replace(/<\/strong>\s+/g, "</strong> ")
              .replace(/<\/strong>\s*<strong>/g, " ")
              .replace(/\s+<strong>\s*<\/strong>(?!\S)/g, " ")
              .replace(/(?!\S)<strong>\s*<\/strong>\s+/g, " ")
              .replace(/(?!\S)<strong>\s*<\/strong>(?!\S)/g, "")
              .replace("hans eller hennes", "hens")
              .replace("hennes eller hans", "hens")
              .replace("honom eller henne", "hen")
              .replace("henne eller honom", "hen")
              .replace("han eller hon", "hen")
              .replace("hon eller han", "hen")
              .trim()
          )
          .filter((el) => !!el)
          .map((el) => (!el.endsWith(".") ? el + "." : el))
      )
      .filter((el) => el.length > 0);

    for (const row of out[req.step]) {
      for (const part of row) {
        const matchedTags = new Set(
          [...part.matchAll(/<([^/>]+)>/g)].map((el) => el[1])
        );

        if (
          matchedTags.size === 0 ||
          (matchedTags.size === 1 && matchedTags.has("strong")) ||
          (matchedTags.size === 1 && matchedTags.has("br"))
        ) {
          continue;
        }

        throw new Error(
          `Found invalid tags '${[...matchedTags].join(", ")}' in '${
            req.text
          }' in grade ${req.step} of course ${data.code[0].trim()}`
        );
      }
    }
    // console.log();
  }

  const criteriaReplacements = join(
    replacementsDirectory,
    "./criteria",
    "c_" + data.code[0].trim() + ".json"
  );
  const criteriaReplacement = await getReplacements(
    criteriaReplacements,
    false
  );

  setValueIfExists(
    criteriaReplacement["E"],
    (value) =>
      checkTextEquality(
        out["E"].flatMap((el) => el).join("\n"),
        value.flatMap((el) => el).join("\n")
      ),
    (value) => {
      out["E"] = value;
    }
  );

  setValueIfExists(
    criteriaReplacement["C"],
    (value) =>
      checkTextEquality(
        out["C"].flatMap((el) => el).join("\n"),
        value.flatMap((el) => el).join("\n")
      ),
    (value) => {
      out["C"] = value;
    }
  );

  setValueIfExists(
    criteriaReplacement["A"],
    (value) =>
      checkTextEquality(
        out["A"].flatMap((el) => el).join("\n"),
        value.flatMap((el) => el).join("\n")
      ),
    (value) => {
      out["A"] = value;
    }
  );

  let hasError = false;

  if (out["E"].length < out["C"].length) {
    console.warn(
      `Found fewer E criteria than C criteria in course: ${data.code[0].trim()} (${
        out["E"].length
      } vs ${out["C"].length})`
    );
    hasError = true;
  }
  if (out["E"].length < out["A"].length) {
    console.warn(
      `Found fewer E criteria than A criteria in course: ${data.code[0].trim()} (${
        out["E"].length
      } vs ${out["A"].length})`
    );
    hasError = true;
  }
  if (out["C"].length < out["A"].length) {
    console.warn(
      `Found fewer C criteria than A criteria in course: ${data.code[0].trim()} (${
        out["C"].length
      } vs ${out["A"].length})`
    );
    hasError = true;
  }

  if (hasError) {
    mkdirp.sync(dirname(criteriaReplacements));
    if (!existsSync(criteriaReplacements)) {
      const criteriaSrc = {};
      for (const step of data.knowledgeRequirements) {
        criteriaSrc[step.gradeStep[0]] = normalizeHTML(step.text[0]).split(
          "\n"
        );
      }
      writeFileSync(
        criteriaReplacements,
        JSON.stringify({ ...out, src: criteriaSrc }, null, "  ")
      );
    }
  }

  const criteriaReplacements2 = join(
    replacementsDirectory,
    "./criteria2",
    "c_" + data.code[0].trim() + ".json"
  );
  const criteriaReplacement2 = await getReplacements(
    criteriaReplacements2,
    false
  );

  function onlyAdded(a: string[][], b: string[][]) {
    const flatA = a.flatMap((el) => el);
    const flatB = b.flatMap((el) => el);

    for (const element of flatA) {
      if (!flatB.includes(element)) {
        throw new Error(`Element ${element} was removed from new array!`);
      }
    }
    return true;
  }

  setValueIfExists(
    criteriaReplacement2["E"],
    (value) => onlyAdded(criteriaReplacement2["E"], value),
    (value) => {
      out["E"] = value;
    }
  );

  setValueIfExists(
    criteriaReplacement2["C"],
    (value) => onlyAdded(criteriaReplacement2["C"], value),
    (value) => {
      out["C"] = value;
    }
  );

  setValueIfExists(
    criteriaReplacement2["A"],
    (value) => onlyAdded(criteriaReplacement2["A"], value),
    (value) => {
      out["A"] = value;
    }
  );

  if (
    out["C"].length !== out["A"].length ||
    out["E"].length !== out["A"].length ||
    out["E"].length !== out["C"].length
  ) {
    console.warn(
      `Found unmatched criteria length in course: ${data.code[0].trim()} (${
        out["E"].length
      }, ${out["C"].length}, ${out["A"].length})`
    );
    if (out["E"].length >= out["C"].length + 2) {
      throw new Error("Can only automatically match length difference of 2");
    }
    if (out["E"].length >= out["A"].length + 2) {
      throw new Error("Can only automatically match length difference of 2");
    }
    if (out["C"].length >= out["A"].length + 2) {
      throw new Error("Can only automatically match length difference of 2");
    }
    hasError = true;
    mkdirp.sync(dirname(criteriaReplacements2));
    if (!existsSync(criteriaReplacements2)) {
      const criteriaSrc = {};
      for (const step of data.knowledgeRequirements) {
        criteriaSrc[step.gradeStep[0]] = normalizeHTML(step.text[0]).split(
          "\n"
        );
      }
      writeFileSync(
        criteriaReplacements2,
        JSON.stringify({ ...out, src: criteriaSrc }, null, "  ")
      );
    }
  }

  //console.log(out);

  //console.log(
  //  [...data.centralContent[0].matchAll(/<li>(.*?)<\/li>/g)].map(el => el[1])
  //);

  const centralContentGroups = [
    ...data.centralContent[0]
      .replace("\n", " ")
      .matchAll(
        /(?:<p>((?:[^<]|(?:<\/?strong>)|\n)+?)<\/p>)?(?:\s|\n)*<ul(?:[^>]+)?>((?:.|\n)*?)<\/ul>/gm
      ),
  ]
    .map(
      (el) =>
        el &&
        ([
          (el[1] && el[1].trim() && $(el[1].trim()).text()) || null,
          [...el[2].trim().matchAll(/<li>(.*?)<\/li>/g)]
            .map((el) => el[1].trim())
            .map((el) =>
              $("<div>" + el + "</div>")
                .text()
                .trim()
            )
            .map((el) => {
              if (el.endsWith(".")) {
                return el;
              }
              return `${el}.`;
            }),
        ] as [string | null, string[]])
    )
    .map(
      (el) =>
        el &&
        ([(el[0] && el[0]!.trim()) || null, el[1]] as [string | null, string[]])
    );

  if (centralContentGroups.length === 0) {
    throw new Error(
      "No central content groups found in course " + data.code[0].trim()
    );
  }

  const centralContent = new Set(
    [...data.centralContent[0].matchAll(/<li>(.*?)<\/li>/g)]
      .map((el) => el[1].trim())
      .map((el) =>
        $("<div>" + el + "</div>")
          .text()
          .trim()
      )
      .map((el) => {
        if (el.endsWith(".")) {
          return el;
        }
        return `${el}.`;
      })
  );

  for (const group of centralContentGroups) {
    for (const row of group[1]!) {
      centralContent.delete(row);
    }
  }

  if (centralContent.size > 0) {
    throw new Error(
      "Central content groups failed to read the following central contents:\n - " +
        [...centralContent].map((el) => `'${el}'`).join("\n - ")
    );
  }

  /*
  console.log(
    data.code[0].trim(),
    [
      ...data.centralContent[0]
        .replace("\n", " ")
        .matchAll(
          /(?:<p>((?:[^<]|(?:<\/?strong>)|\n)+?)<\/p>)?(?:\s|\n)*<ul(?:[^>]+)?>((.|\n)*?)<\/ul>/gm
        )
    ].length,
    centralContentGroups
    //data.centralContent[0]
  );
  */

  const course = {
    subject: subject.code,
    title: data.name[0].trim(),
    code: data.code[0].trim(),
    points: parseInt(data.point[0], 10),
    criteria: out,
    centralContent: centralContentGroups,
    /*UNSAFE_centralContent: (
      "<div>" +
      normalizeHTML(data.centralContent[0]) +
      "</div>"
    ).split("\n"),*/
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
    applicableSubjectPurposes: [] as number[],
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
        course.applicableSubjectPurposes.map((el) => el + 1).join(", ") +
        " on range 1-" +
        subject.developmentPurposes.length +
        ")"
    );

    course.applicableSubjectPurposes = course.applicableSubjectPurposes.filter(
      (el) => el < subject.developmentPurposes.length
    );
  }

  return course;
}
