import { parseXML } from "../utils/parseXml";
import { normalizeHTML } from "../utils/normalizeHtml";

import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { readProgramOrientations } from "./orientations";
import { getReplacements } from "../replacement";
import { readProgramSubjects } from "./subjects";

function warnNonEmptyArray(array: any[], message: string) {
  if (array.length > 1 || typeof array[0] !== "string") {
    console.warn(message);
  }
}

export async function parseProgram(
  name: string,
  replacementsDirectory: string
) {
  const str = readFileSync(name, "utf-8");
  const rawData = await parseXML(str);
  const data = rawData.program;

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
    `warning: Program ${data.code[0]} has non-empty <individualChoice/>`
  );
  warnNonEmptyArray(
    data.projectAssignment,
    `warning: Program ${data.code[0]} has non-empty <projectAssignment/>`
  );

  const program = {
    title: data.name[0].trim(),
    code: data.code[0].trim(),
    url: urls[data.code[0]] || null,
    typeOfSchooling: data.typeOfSchooling[0].trim(),
    typeOfProgram: data.typeOfProgram[0].trim(),
    applicableFrom: new Date(data.applianceDate[0]).toISOString(),
    info: {
      degreeObjective: {
        html: normalizeHTML(degreeObjective.content.join("\n"))
      },
      orientation: {
        title: orientation.title[0].trim(),
        html: normalizeHTML(orientation.content.join("\n"))
      },
      educationObjective: {
        title: educationObjective.title[0].trim(),
        html: normalizeHTML(educationObjective.content.join("\n"))
      }
    },
    education: {
      mandatory: readProgramSubjects(commonMandatory.subject),
      program: readProgramSubjects(commonProgram.subject),
      specialization: readProgramSubjects(specialization.subject),
      orientations:
        typeof data.programOrientations[0] === "object"
          ? data.programOrientations[0].programOrientation.map(el => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readProgramSubjects(el.subject)
            }))
          : [],
      profiles:
        typeof data.profiles[0] === "object"
          ? data.profiles[0].profile.map(el => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readProgramSubjects(el.subject)
            }))
          : [],
      professionalDegrees:
        typeof data.professionalDegrees[0] === "object"
          ? data.professionalDegrees[0].professionalDegree.map(el => {
              if (
                el.profSpecialization.length > 1 ||
                typeof el.profSpecialization[0] !== "string"
              ) {
                console.warn(
                  `warning: Orientation ${el.programOrientationCode[0]} in program ${data.code[0]} has non-empty <profSpecialization/>`
                );
              }

              if (el.subject == null) {
                console.warn(
                  `warning: Orientation ${el.programOrientationCode[0]} in program ${data.code[0]} has empty <subject/>`
                );
              }

              return {
                name: el.name[0].trim(),
                code: el.programOrientationCode[0].trim(),
                ...readProgramSubjects(el.subject)
              };
            })
          : []
    }
  };

  const manualReplacements = await getReplacements(
    join(replacementsDirectory, "./program", program.code + ".json")
  );
  readProgramOrientations(manualReplacements, data, program);

  assert.oneOf(program.info.orientation.title, ["Inriktningar", "Profiler"]);
  assert.equal(
    program.info.educationObjective.title,
    "Mål för gymnasiearbetet"
  );

  return program;
}
