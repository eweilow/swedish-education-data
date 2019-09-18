const xml2js = require("xml2js");
const assert = require("chai").assert;
const glob = require("glob");

function parseXML(str) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(str, { explicitArray: true }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

const prettier = require("prettier");

function normalizeHTML(html) {
  return prettier
    .format(html, {
      parser: "html",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false
    })
    .replace("<p></p>", "")
    .trim();
}

function readSubjects(inSubjects) {
  const courses = [];
  const subjects = [];

  for (const subject of inSubjects) {
    const name = subject.name[0];
    const code = subject.code[0];
    const point = parseInt(subject.point[0], 10);
    const subjectCourses = [];

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

function setValueIfExists(value, assertValue, assign) {
  if (value != null) {
    if (assertValue(value)) {
      assign(value);
    } else {
      throw new Error(`Manual replacement value does not assert to true`);
    }
  }
}
async function parseProgram(name) {
  const str = require("fs").readFileSync(name, "utf-8");
  const rawData = await parseXML(str);
  const data = rawData.program;

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

  const program = {
    title: data.name[0],
    code: data.code[0],
    typeOfSchooling: data.typeOfSchooling[0],
    typeOfProgram: data.typeOfProgram[0],
    applicableFrom: new Date(data.applianceDate[0]).toISOString(),
    info: {
      degreeObjective: {
        html: normalizeHTML(degreeObjective.content.join("\n"))
      },
      orientation: {
        title: orientation.title[0],
        html: normalizeHTML(orientation.content.join("\n"))
      },
      educationObjective: {
        title: educationObjective.title[0],
        html: normalizeHTML(educationObjective.content.join("\n"))
      }
    },
    education: {
      mandatory: readSubjects(commonMandatory.subject),
      program: readSubjects(commonProgram.subject)
    }
  };

  let manualReplacements = {};

  const replacementFile = path.join(
    __dirname,
    "./manual",
    path.join(
      path.dirname(
        path.relative(path.join(__dirname, "./src/gyP1_7_S1_4"), name)
      ),
      program.code + ".json"
    )
  );

  const found = fs.existsSync(replacementFile);

  if (found) {
    console.log(
      `Replacement ${path.relative(
        __dirname,
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
    value => {
      console.info("assert text content is equal of HTML,");
      // assert that text content is equal?
      return true;
    },
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

  console.log(program.code, restStrings, usableStrings);

  program.info.orientation.html = normalizeHTML(
    restStrings.map(el => `<p>${el}</p>`).join("\n")
  );

  assert.oneOf(program.info.orientation.title, ["Inriktningar", "Profiler"]);
  assert.equal(
    program.info.educationObjective.title,
    "Mål för gymnasiearbetet"
  );

  return { program, data };
}

function readGlobFiles(...array) {
  let globPromises = [];
  for (let [directory, globStr, tag = false] of array) {
    globPromises.push(
      new Promise((resolve, reject) => {
        glob(globStr, { cwd: directory, root: directory }, (err, files) => {
          if (err) return reject(err);

          resolve(files.map(file => path.join(directory, file)));
        });
      })
    );
  }
  return Promise.all(globPromises).then(arr => [].concat(...arr));
}

const fs = require("fs");
const path = require("path");
async function run() {
  const directory = "./src/gyP1_7_S1_4";
  const programGlobs = await readGlobFiles([
    path.join(__dirname, directory),
    "**/program/*.xml"
  ]);

  const programmes = [];
  for (const glob of programGlobs) {
    const data = await parseProgram(glob);

    fs.writeFileSync(
      "./out/" + data.program.code + ".json",
      JSON.stringify(data, null, "  ")
    );

    programmes.push({
      code: data.program.code,
      title: data.program.title,
      file: "./out/" + data.program.code + ".json"
    });
  }
  fs.writeFileSync(
    "./out/programmes.json",
    JSON.stringify(programmes, null, "  ")
  );
}

run().catch(err => console.error(err));
