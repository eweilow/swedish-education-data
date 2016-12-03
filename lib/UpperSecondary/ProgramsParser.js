const xml2js = require("xml2js");
const assert = require("chai").assert;
const cheerio = require("cheerio");

function parseXML(str) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(str, { explicitArray: false }, (err, result) => {
      if(err) return reject(err);
      resolve(result);
    })
  })
}

function parseCourses(xmlGroup, subjects, courses, xmlProgram) {
  if(!xmlGroup) return [];

  let context = xmlProgram.name;
  if(!Array.isArray(xmlGroup)) xmlGroup = [xmlGroup];
  assert.isArray(xmlGroup, context);

  let hasSubjects = new Set();
  let hasCourses = new Set();
  for(let subject of xmlGroup) {
    let context = xmlProgram.name + " - " + subject.name + "/" + subject.code;
    if(!subject.alias) {
      assert.isTrue(subjects.has(subject.code), context);
      hasSubjects.add({
        code: subject.code,
        optional: subject.optional === "true",
        title: subject.name,
        points: parseInt(subject.point)
      });
      if(!subject.course) {
        console.log(`Warning: subject '${subject.code}' is missing courses in program '${xmlProgram.name}'`);
        continue;
      }
    
      if(!Array.isArray(subject.course)) subject.course = [subject.course];
      assert.isTrue(Array.isArray(subject.course), context);
      for(let course of subject.course) {
        let context = xmlProgram.name + " - " + subject.code + " - " + course.code;
        assert.isTrue(courses.has(course.code), context);
        hasCourses.add({
          code: course.code,
          optional: course.optional === "true",
          title: course.name,
          points: parseInt(course.point)
        });
      }
    } else {
      console.log(`Encountering alias subject '${subject.code}'/'${subject.name}' in program '${xmlProgram.name}'`)
      assert.equal(subject.alias, "true", context);
      assert.isUndefined(subject.course, context);
      hasSubjects.add({
        alias: true,
        optional: subject.optional === "true",
        code: subject.code,
        title: subject.name,
        points: parseInt(subject.point)
      });
    }
  }

  assert.isAtLeast(hasSubjects.size, 1, context);
  assert.isAtLeast(hasCourses.size, 1, context);

  return {
    subjects: Array.from(hasSubjects),
    courses: Array.from(hasCourses)
  };
}

function parseOrientations(xmlGroup, subjects, courses, degrees, xmlProgram) {
  if(!xmlGroup) return [];
  let context = xmlProgram.name;

  if(!Array.isArray(xmlGroup.programOrientation)) xmlGroup.programOrientation = [xmlGroup.programOrientation];
  assert.isArray(xmlGroup.programOrientation, context);

  for(let xmlOrientation of xmlGroup.programOrientation) {
    let context = xmlProgram.name + " - " + xmlOrientation.code;
    assert.isString(xmlOrientation.name, context);
    assert.isString(xmlOrientation.code, context);
    assert.isString(xmlOrientation.codeExternal, context);
    assert.equal(xmlOrientation.code, xmlOrientation.codeExternal, context);
    assert.isString(xmlOrientation.point, context);

    let orientation = {
      title: xmlOrientation.name,
      code: xmlOrientation.code,
      points: parseInt(xmlOrientation.point),
      courses: parseCourses(xmlOrientation.subject, subjects, courses, xmlProgram),
      degrees: degrees.has(xmlOrientation.code) ? Array.from(degrees.get(xmlOrientation.code)) : []
    };

    assert.isNotNaN(orientation.points);
  }

  return [];
}

function parseProfessionalDegrees(xmlGroup, subjects, courses, xmlProgram) {
  if(!xmlGroup) return new Map();
  let context = xmlProgram.name;

  if(!Array.isArray(xmlGroup.professionalDegree)) xmlGroup.professionalDegree = [xmlGroup.professionalDegree];
  assert.isArray(xmlGroup.professionalDegree, context);

  let degrees = new Map();
  for(let xmlDegree of xmlGroup.professionalDegree) {
    let context = xmlProgram.name + " - " + xmlDegree.programOrientationCode;
    assert.isString(xmlDegree.name, context);
    assert.isString(xmlDegree.programOrientationCode, context);

    let degree = {
      title: xmlDegree.name,
      courses: parseCourses(xmlDegree.subject, subjects, courses, xmlProgram),
      specialization: parseCourses(xmlDegree.profSpecialization.subject, subjects, courses, xmlProgram)
    };

    if(degrees.has(xmlDegree.programOrientationCode)) {
      degrees.get(xmlDegree.programOrientationCode).add(degree);
    } else {
      degrees.set(xmlDegree.programOrientationCode, new Set([ degree ]));
    }
  }

  return degrees;
}

function createListFromHTMLPTags(html, xmlProgram) {
  let context = xmlProgram.name;

  let $ = cheerio.load(html);
  assert.equal($.root().children(":not(p)").length, 0, context);
  
  let rows = [];
  $.root().children("p").each((index, element) => {
    rows.push($(element).text().trim());
  });

  rows = rows.filter(element => !!element);
  assert.isAtLeast(rows.length, 1, context);
  return rows;
}

module.exports = function parsePrograms(files, subjects, courses) {
  const validTypesOfSchooling = [
    "UPPER_SECONDARY_EDUCATION", 
    "SWEDISH_FOR_IMMIGRANTS", 
    "SAMI_SCHOOL",
    "EDU_FOR_ADULTS_WITH_LEARNING_DISABILITIES", 
    "EDU_FOR_PUPILS_WITH_LEARNING_DISABILITIES",
    "ADULT_SECONDARY_EDUCATION", 
    "SPECIAL_SCHOOL_FOR_PUPILS_WITH_IMPAIRED_HEARING"
  ];
  const validTypesOfPrograms = [
    "NATIONAL_RECRUITMENT_FOR_LOCAL_SPECIALIZATION",
    "VOCATIONAL_PROGRAM",
    "PRELIMINARY_PROGRAM_FOR_HIGHER_EDUCATION"
  ];

  let xmlParsePromises = [];
  for(let fileContents of files) {
    xmlParsePromises.push(parseXML(fileContents.toString()));
  }
  return Promise.all(xmlParsePromises)
    .then((xmlFiles) => {
      let counts = { };
      for(let xml of xmlFiles) {
        const xmlProgram = xml.program;
        assert.isFalse(Array.isArray(xmlProgram), "should not be array");

        if(counts.hasOwnProperty(xmlProgram.code)) counts[xmlProgram.code]++;
        else counts[xmlProgram.code] = 1;
      }

      xmlFiles.sort((a, b) => {
        return a.program.name.localeCompare(b.program.name);
      })
      let programs = new Map();
      for(let xml of xmlFiles) {
        const xmlProgram = xml.program;
        let context = xmlProgram.name || "unknown program";
        assert.isString(xmlProgram.name, context);
        assert.isString(xmlProgram.code, context);
        assert.isString(xmlProgram.codeExternal, context);
        assert.equal(xmlProgram.code, xmlProgram.codeExternal, context);
        assert.isString(xmlProgram.applianceDate, context);

        assert.isString(xmlProgram.purpose.degreeObjective.title, context);
        assert.isString(xmlProgram.purpose.degreeObjective.content, context);
        assert.isTrue(["Examensmål", "Mål för programmet", "Mål för utbildningen"].indexOf(xmlProgram.purpose.degreeObjective.title) >= 0, context + "-" + xmlProgram.purpose.degreeObjective.title);

        assert.isString(xmlProgram.purpose.orientation.title, context);
        assert.isString(xmlProgram.purpose.orientation.content, context);
        assert.equal(xmlProgram.purpose.orientation.title, "Inriktningar", context);

        assert.isString(xmlProgram.purpose.educationObjective.title, context);
        assert.isString(xmlProgram.purpose.educationObjective.content, context);
        assert.equal(xmlProgram.purpose.educationObjective.title, "Mål för gymnasiearbetet", context);

        assert.isString(xmlProgram.typeOfSchooling, context);
        assert.isString(xmlProgram.typeOfProgram, context);
        assert.isTrue(!xmlProgram.individualChoice, context); //why is this even a part of the data?

        assert.isTrue(validTypesOfSchooling.indexOf(xmlProgram.typeOfSchooling) >= 0, context);
        assert.equal(xmlProgram.typeOfSchooling, "UPPER_SECONDARY_EDUCATION", context);

        assert.isTrue(validTypesOfPrograms.indexOf(xmlProgram.typeOfProgram) >= 0, context);

        let projectAssignment = false;
        if(xmlProgram.projectAssignment) {
          assert.isDefined(xmlProgram.projectAssignment, context);
          assert.isDefined(xmlProgram.projectAssignment.subject, context);
          assert.isFalse(Array.isArray(xmlProgram.projectAssignment.subject), context);
          assert.isString(xmlProgram.projectAssignment.subject.name, context);
          assert.isString(xmlProgram.projectAssignment.subject.code, context);
          assert.isDefined(xmlProgram.projectAssignment.subject.optional, context);

          projectAssignment = {
            title: xmlProgram.projectAssignment.subject.name,
            code: xmlProgram.projectAssignment.subject.code,
            optional: xmlProgram.projectAssignment.subject.optional
          };
        }

        if(xmlProgram.code !== "RX") {
          assert.equal(counts[xmlProgram.code], 1, context);
        }

        let degrees = parseProfessionalDegrees(xmlProgram.professionalDegrees, subjects, courses, xmlProgram);

        let program = {
          title: xmlProgram.name.trim(),
          code: xmlProgram.code.trim(),
          navigationalIndex: 0,
          navigationalCode: xmlProgram.code.trim(),
          appliesFrom: new Date(xmlProgram.applianceDate),
          typeOfSchooling: xmlProgram.typeOfSchooling,
          typeOfProgram: xmlProgram.typeOfProgram,
          degreeObjectiveText: createListFromHTMLPTags(xmlProgram.purpose.degreeObjective.content, xmlProgram),
          orientationsText: createListFromHTMLPTags(xmlProgram.purpose.orientation.content, xmlProgram),
          projectAssignmentText: createListFromHTMLPTags(xmlProgram.purpose.educationObjective.content, xmlProgram),
          coursesAndSubjects: {
            mandatory: parseCourses(xmlProgram.commonMandatory.subject, subjects, courses, xmlProgram),
            program: parseCourses(xmlProgram.commonMandatory.subject, subjects, courses, xmlProgram),
            specialization: parseCourses(xmlProgram.specialization.subject, subjects, courses, xmlProgram)
          },
          orientations: parseOrientations(xmlProgram.programOrientations, subjects, courses, degrees, xmlProgram),
          degrees: Array.from(degrees),
          projectAssignment: projectAssignment
        };

        assert.isNotNaN(program.appliesFrom.getTime(), context);
        assert.isArray(program.coursesAndSubjects.mandatory.courses, context);
        assert.isArray(program.coursesAndSubjects.mandatory.subjects, context);
        assert.isArray(program.coursesAndSubjects.program.courses, context);
        assert.isArray(program.coursesAndSubjects.program.subjects, context);
        assert.isArray(program.coursesAndSubjects.specialization.courses, context);
        assert.isArray(program.coursesAndSubjects.specialization.subjects, context);
        assert.isArray(program.orientations, context);
        assert.isArray(program.degrees, context);

        while(programs.has(program.navigationalCode)) {
          program.navigationalIndex++;
          program.navigationalCode = `${program.code}${program.navigationalIndex}`;
        }
        programs.set(program.navigationalCode, program);
      }
      return programs;
    });
}