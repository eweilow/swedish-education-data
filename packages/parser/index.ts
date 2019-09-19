import { parseXML } from "./utils/parseXml";
import { readGlobFiles } from "./utils/globMatch";
import { normalizeHTML } from "./utils/normalizeHtml";
import { checkTextEquality } from "./utils/matchText";
import { setValueIfExists } from "./utils/setValueIfExists";

import { sync as mkdirp } from "mkdirp";
import { assert } from "chai";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, relative, dirname } from "path";

function readSubjects(inSubjects: any) {
  if (!inSubjects) {
    return { courses: [], subjects: [] };
  }
  const courses: any[] = [];
  const subjects: any[] = [];

  for (const subject of inSubjects) {
    if (typeof subject !== "object") {
      continue;
    }
    const name = subject.name[0];
    const code = subject.code[0];
    const point = subject.point != null ? parseInt(subject.point[0], 10) : 0;
    const subjectCourses: any[] = [];

    let coursePoints = 0;
    for (const course of subject.course || []) {
      if (!courses.includes(course.code[0])) {
        courses.push(course.code[0]);
      }
      subjectCourses.push(course.code[0]);
      coursePoints += parseInt(course.point[0], 10);
    }

    subjects.push({
      code,
      minPoints: Math.max(point, coursePoints),
      courses: subjectCourses
    });
  }

  return {
    courses,
    subjects
  };
}

async function parseProgram(name: string) {
  const str = readFileSync(name, "utf-8");

  const rawData = await parseXML(str);
  const data = rawData.program;

  const urls = require(join(process.cwd(), "./manual/program/urls.json"));

  // console.log();
  // console.log();
  // console.log();
  // console.log();
  // console.log(name);

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

  if (
    data.individualChoice.length > 1 ||
    typeof data.individualChoice[0] !== "string"
  ) {
    console.warn(
      `warning: Program ${data.code[0]} has non-empty <individualChoice/>`
    );
  }
  if (
    data.projectAssignment.length > 1 ||
    typeof data.projectAssignment[0] !== "string"
  ) {
    console.warn(
      `warning: Program ${data.code[0]} has non-empty <projectAssignment/>`
    );
  }

  const program = {
    /*data: {
      ...data,
      commonMandatory: null,
      commonProgram: null,
      specialization: null
    },
    */
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
      mandatory: readSubjects(commonMandatory.subject),
      program: readSubjects(commonProgram.subject),
      specialization: readSubjects(specialization.subject),
      orientations:
        typeof data.programOrientations[0] === "object"
          ? data.programOrientations[0].programOrientation.map(el => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readSubjects(el.subject)
            }))
          : [],
      profiles:
        typeof data.profiles[0] === "object"
          ? data.profiles[0].profile.map(el => ({
              name: el.name[0].trim(),
              code: el.code[0].trim(),
              points: parseInt((el.points || el.point)[0], 10),
              ...readSubjects(el.subject)
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
                ...readSubjects(el.subject)
              };
            })
          : []
    }
  };

  let manualReplacements = {};

  const replacementFile = join(
    process.cwd(),
    "./manual",
    join(
      dirname(relative(join(process.cwd(), "./data/gyP1_7_S1_4"), name)),
      program.code + ".json"
    )
  );

  const found = existsSync(replacementFile);

  if (found) {
    console.log(
      `Replacement ${relative(
        process.cwd(),
        replacementFile
      )}: found replacements`
    );
    manualReplacements = require(replacementFile);
    for (const key of Object.keys(manualReplacements)) {
      console.log(` - ${key}`);
    }
  }

  setValueIfExists(
    manualReplacements["program.info.orientation.html"],
    value => checkTextEquality(program.info.orientation.html, value.join("\n")),
    value => {
      program.info.orientation.html = normalizeHTML(value.join("\n"));
    }
  );

  //console.log(program.info.orientation.html);

  const orientations = [
    ...program.info.orientation.html.matchAll(/\<p\>((?:\n|.)*?)\<\/p\>/gm)
  ];

  const possibleStrings = orientations.map(el => el[1]);
  const countOfSuitableStrings = possibleStrings.map(
    el =>
      [...el.matchAll(/(Inriktningen|Profilen)(?:\s|\n)*\<italic\>/gm)].length
  );

  const erronousStrings = possibleStrings.filter(
    (_, i) => countOfSuitableStrings[i] > 1
  );
  if (erronousStrings.length > 0) {
    throw new Error(
      `The orientation HTML in program '${program.title}' (${program.code}) cannot be used to extract information about orientations:\n | ` +
        program.info.orientation.html.replace(/\n/g, "\n | ")
    );
  }

  const usableStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 1)
    .map(el => normalizeHTML(el));

  const restStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 0)
    .map(el => normalizeHTML(el));

  const programOrientations = data.programOrientations[0].programOrientation;
  const profiles = data.profiles[0].profile;
  //const programOrientations = data.programOrientations[0].programOrientation

  if (programOrientations != null) {
    assert.equal(
      usableStrings.length,
      programOrientations.length,
      `count of programOrientations should match orientation HTML in program ${program.code}`
    );
  } else if (profiles != null) {
    assert.equal(
      usableStrings.length,
      profiles.length,
      `count of profiles should match orientation HTML in program ${program.code}`
    );
  } else {
    assert.equal(
      usableStrings.length,
      0,
      "A program without programOrientations or profiles should have no matched HTML"
    );
  }

  program.info.orientation.html = normalizeHTML(
    restStrings.map(el => `<p>${el}</p>`).join("\n")
  );

  assert.oneOf(program.info.orientation.title, ["Inriktningar", "Profiler"]);
  assert.equal(
    program.info.educationObjective.title,
    "Mål för gymnasiearbetet"
  );

  return program;
}

export async function run() {
  const directory = "./data/gyP1_7_S1_4";
  const programGlobs = await readGlobFiles({
    directory: join(process.cwd(), directory),
    globStr: "**/program/*.xml"
  });

  mkdirp("./out");

  const programmes: any[] = [];
  for (const glob of programGlobs) {
    const data = await parseProgram(glob);

    writeFileSync(
      "./out/" + data.code + ".json",
      JSON.stringify(data, null, "  ")
    );

    programmes.push({
      code: data.code,
      title: data.title,
      file: "./out/" + data.code + ".json"
    });
  }

  programmes.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(
    "./out/programmes.json",
    JSON.stringify(programmes, null, "  ")
  );
}
