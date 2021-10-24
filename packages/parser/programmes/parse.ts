import { normalizeHTML } from "../utils/normalizeHtml";

import * as $ from "cheerio";
import { assert } from "chai";
import { join } from "path";
import { readProgramOrientations } from "./orientations";
import { getReplacements } from "../replacement";
import { readProgramSubjects } from "./subjects";

function warnNonEmptyArray(array: any[], message: string) {
  if (array.length > 1 || typeof array[0] !== "string") {
    console.warn(message);
  }
}

export async function parseProgram(data: any, replacementsDirectory: string) {
  const urls = require(join(replacementsDirectory, "./program/urls.json"));

  const [
    degreeObjective,
    ...rest_degreeObjective
  ] = data.purpose[0].degreeObjective;
  const [orientation, ...rest_orientation] = data.purpose[0].orientation;
  const [
    educationObjective,
    ...rest_educationObjective
  ] = data.purpose[0].educationObjective;

  assert.isEmpty(rest_degreeObjective);
  assert.isEmpty(rest_orientation);
  assert.isEmpty(rest_educationObjective);

  const [commonMandatory, ...rest_commonMandatory] = data.commonMandatory;
  const [commonProgram, ...rest_commonProgram] = data.commonProgram;
  const [specialization, ...rest_specialization] = data.specialization;
  assert.isEmpty(rest_commonMandatory);
  assert.isEmpty(rest_commonProgram);
  assert.isEmpty(rest_specialization);

  warnNonEmptyArray(
    data.individualChoice,
    `warning: Program ${data.code[0].trim()} has non-empty <individualChoice/>`
  );
  warnNonEmptyArray(
    data.projectAssignment,
    `warning: Program ${data.code[0].trim()} has non-empty <projectAssignment/>`
  );

  function exportParagraphs(inputStr: string) {
    const strs = [...inputStr.matchAll(/<p>((?:.|\n)+?)<\/p>/g)].map((el) =>
      $("<div>" + el[1] + "</div>")
        .text()
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    const left = strs.join(" ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    const right = $("<div>" + normalizeHTML(inputStr) + "</div>")
      .text()
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (left !== right) {
      throw new Error(
        "Unmatching text:\n'" + left + "'\n\nand\n\n'" + right + "'"
      );
    }

    return strs;
  }

  if (orientation.title[0].trim() !== "Inriktningar") {
    console.warn(
      `warning: Program ${data.code[0].trim()} has orientation.title[0].trim() !== "Inriktningar" ('${orientation.title[0].trim()}' !== "Inriktningar")`
    );
  }

  if (educationObjective.title[0].trim() !== "Mål för gymnasiearbetet") {
    console.warn(
      `warning: Program ${data.code[0].trim()} has orientation.title[0].trim() !== "Mål för gymnasiearbetet" ('${educationObjective.title[0].trim()}' !== "Mål för gymnasiearbetet")`
    );
  }

  const manualReplacements = await getReplacements(
    join(
      replacementsDirectory,
      "./program",
      "p_" + data.code[0].trim() + ".json"
    )
  );

  const program = {
    title: data.name[0].trim(),
    code: data.code[0].trim(),
    url: urls[data.code[0].trim()] || null,
    typeOfSchooling: data.typeOfSchooling[0].trim(),
    typeOfProgram: data.typeOfProgram[0].trim(),
    applicableFrom: new Date(data.applianceDate[0]).toISOString(),
    info: {
      degreeObjectives: exportParagraphs(degreeObjective.content.join(" ")),
      orientation: {
        title: orientation.title[0].trim(),
        lines: exportParagraphs(
          readProgramOrientations(
            manualReplacements,
            orientation.content.join("\n"),
            data
          )
        ),
      },
      educationObjectives: exportParagraphs(
        educationObjective.content.join("\n")
      )
        .join("")
        .split(/\.\s+(?=Gymnasiearbetet)/g)
        .map((el) => el.trim())
        .map((el) => (el.endsWith(".") ? el : `${el}.`)),
    },
    education: {
      mandatory: readProgramSubjects(commonMandatory.subject),
      program: readProgramSubjects(commonProgram.subject),
      specialization: readProgramSubjects(specialization.subject),
      orientations:
        typeof data.programOrientations[0] === "object"
          ? data.programOrientations[0].programOrientation.map((el) => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readProgramSubjects(el.subject),
            }))
          : [],
      profiles:
        typeof data.profiles[0] === "object"
          ? data.profiles[0].profile.map((el) => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readProgramSubjects(el.subject),
            }))
          : [],
      professionalDegrees:
        typeof data.professionalDegrees[0] === "object"
          ? data.professionalDegrees[0].professionalDegree.map((el) => {
              if (
                el.profSpecialization.length > 1 ||
                typeof el.profSpecialization[0] !== "string"
              ) {
                console.warn(
                  `warning: Orientation ${
                    el.programOrientationCode[0]
                  } in program ${data.code[0].trim()} has non-empty <profSpecialization/>`
                );
              }

              if (el.subject == null) {
                console.warn(
                  `warning: Orientation ${
                    el.programOrientationCode[0]
                  } in program ${data.code[0].trim()} has empty <subject/>`
                );
              }

              return {
                name: el.name[0].trim(),
                code: el.programOrientationCode[0].trim(),
                ...readProgramSubjects(el.subject),
              };
            })
          : [],
    },
  };

  assert.oneOf(program.info.orientation.title, ["Inriktningar", "Profiler"]);
  return program;
}
