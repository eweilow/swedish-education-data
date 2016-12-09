const xml2js = require("xml2js");
const assert = require("chai").assert;
const cheerio = require("cheerio");
const distance = require("jaro-winkler");

function parseXML(str) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(str, { explicitArray: false }, (err, result) => {
      if(err) return reject(err);
      resolve(result);
    })
  })
}

function parseCourses(xmlGroup, subjects, courses, xmlProgram) {
  if(!xmlGroup) return {courses: [], subjects: []};

  let context = xmlProgram.name;
  if(!Array.isArray(xmlGroup)) xmlGroup = [xmlGroup];
  assert.isArray(xmlGroup, context);

  let hasSubjects = new Set();
  let hasCourses = new Set();
  for(let subject of xmlGroup) {
    let context = xmlProgram.name + " - " + subject.name + "/" + subject.code;

    let subjectCourses = new Set();
    if(!subject.alias) {
      assert.isTrue(subjects.has(subject.code), context);
      let subjectObject = {
        code: subject.code,
        optional: subject.optional === "true",
        title: subject.name,
        points: parseInt(subject.point)
      };
      if(!subject.course) {
        console.log(`Warning: subject '${subject.code}' is missing courses in program '${xmlProgram.name}'`);
        continue;
      }
    
      if(!Array.isArray(subject.course)) subject.course = [subject.course];
      assert.isTrue(Array.isArray(subject.course), context);
      for(let course of subject.course) {
        if(course.name === "Saknas i kursplan") continue;

        let context = xmlProgram.name + " - " + subject.code + " - " + course.code;
        assert.isTrue(courses.has(course.code.trim()), context);
        let courseObject = {
          code: course.code.trim(),
          optional: course.optional === "true",
          title: course.name,
          points: parseInt(course.point)
        };
        hasCourses.add(courseObject);
        subjectCourses.add(courseObject);
      }
      let coursePoints = 0;
      for(let course of subjectCourses) {
        coursePoints += course.points;
      }
      subjectObject.points = coursePoints;
      subjectObject.courses = Array.from(subjectCourses);
      hasSubjects.add(subjectObject);
    } else {
      console.log(`Encountering alias subject '${subject.code}'/'${subject.name}' in program '${xmlProgram.name}'`)
      assert.equal(subject.alias, "true", context);
      assert.isUndefined(subject.course, context);
      let subjectObject = {
        alias: true,
        optional: subject.optional === "true",
        code: subject.code.trim(),
        title: subject.name,
        points: parseInt(subject.point),
        courses: []
      };
      hasSubjects.add(subjectObject);
    }
  }

  assert.isAtLeast(hasSubjects.size, 1, context);
  assert.isAtLeast(hasCourses.size, 1, context);

  return {
    subjects: Array.from(hasSubjects),
    courses: Array.from(hasCourses)
  };
}

function parseOrientations(xmlGroup, subjects, courses, degrees, orientationsTextMap, xmlProgram) {
  if(!xmlGroup) return [];
  let context = xmlProgram.name;

  if(!Array.isArray(xmlGroup.programOrientation)) xmlGroup.programOrientation = [xmlGroup.programOrientation];
  assert.isArray(xmlGroup.programOrientation, context);

  let orientations = [];
  for(let xmlOrientation of xmlGroup.programOrientation) {
    let context = xmlProgram.name + " - " + xmlOrientation.code;
    xmlOrientation.name = xmlOrientation.name.replace(/\n/gi, "").trim();
    assert.isString(xmlOrientation.name, context);
    assert.isString(xmlOrientation.code, context);
    assert.isString(xmlOrientation.codeExternal, context);
    assert.equal(xmlOrientation.code, xmlOrientation.codeExternal, context);
    assert.isString(xmlOrientation.point, context);
    
    let text = "";
    let maxDistance = 0;
    for(let [index, str] of orientationsTextMap) {
      let distanceValue = distance(index.toLowerCase(), xmlOrientation.name.toLowerCase());
      if(distanceValue > maxDistance) {
        text = str;
        maxDistance = distanceValue;
      }
    }
    assert.isAtLeast(maxDistance, 0.9, context);
    let orientation = {
      title: xmlOrientation.name,
      code: xmlOrientation.code,
      description: text,
      points: parseInt(xmlOrientation.point),
      courses: parseCourses(xmlOrientation.subject, subjects, courses, xmlProgram),
      degrees: degrees.has(xmlOrientation.code) ? Array.from(degrees.get(xmlOrientation.code)) : []
    };

    assert.isString(orientation.description);
    assert.isNotNaN(orientation.points);

    orientations.push(orientation);
  }

  return orientations;
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

function parseOrientationText(html, xmlProgram) {
  let context = xmlProgram.name;

  let $ = cheerio.load(html);
  assert.equal($.root().children(":not(p)").length, 0, context);
  
  let rows = [];
  $.root().children("p").each((index, element) => {
    rows.push($(element).text().trim());
  });

  let mapped = new Map();
  $("italic").each((index, element) => {
    let text = $(element).text();

    let parent = $(element.parent);
    mapped.set(text, parent.text());
  });

  rows = rows.filter(element => !!element);
  assert.isAtLeast(rows.length, 1, context);

  return { rows: rows, mapped: mapped };
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
  const customProgramUrls = {
    "BF": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/barn-och-fritidsprogrammet",
    "BA": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/bygg-och-anlaggningsprogrammet",
    "EK": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/ekonomiprogrammet",
    "EE": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/el-och-energiprogrammet",
    "ES": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/estetiska-programmet",
    "RX1": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/flygteknikutbildningen",
    "FT": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/fordons-och-transportprogrammet",
    "HA": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/handels-och-administrationsprogrammet",
    "HV": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/hantverksprogrammet",
    "HT": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/hotell-och-turismprogrammet",
    "HU": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/humanistiska-programmet",
    "IN": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/industritekniska-programmet",
    "RX2": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/marinteknikutbildningen",
    "NB": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/naturbruksprogrammet",
    "NA": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/naturvetenskapsprogrammet",
    "RL": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/restaurang-och-livsmedelsprogrammet",
    "SA": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/samhallsvetenskapsprogrammet",
    "RX5": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/samiska-naringar",
    "RX3": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/sjofartsutbildningen",
    "TE": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/teknikprogrammet",
    "RX4": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/tagteknikutbildningen",
    "VF": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/vvs-och-fastighetsprogrammet",
    "VO": "http://www.skolverket.se/laroplaner-amnen-och-kurser/gymnasieutbildning/gymnasieskola/programstruktur-och-examensmal/vard-och-omsorgsprogrammet",
    "RX6": "http://www.skolverket.se/skolformer/gymnasieutbildning/gymnasieskola/program-och-utbildningar/riksrekryterande-utbildningar/yrkesdansarutbildningen"
  };

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
      });

      let navigationallyShiftedPrograms = new Set(); //Set navigationalCode = code + "1";
      let programs = new Map();
      for(let xml of xmlFiles) {
        const xmlProgram = xml.program;
        xmlProgram.name = xmlProgram.name.replace(/\n/gi, "").trim();
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
        let {rows: orientationText, mapped: orientationTextMap} = parseOrientationText(xmlProgram.purpose.orientation.content, xmlProgram);

        let program = {
          title: xmlProgram.name.trim().replace(/–/g, "-"),
          code: xmlProgram.code.trim(),
          navigationalIndex: 0,
          navigationalCode: xmlProgram.code.trim(),
          appliesFrom: new Date(xmlProgram.applianceDate),
          typeOfSchooling: xmlProgram.typeOfSchooling,
          typeOfProgram: xmlProgram.typeOfProgram,
          degreeObjectiveText: createListFromHTMLPTags(xmlProgram.purpose.degreeObjective.content, xmlProgram),
          orientationsText: orientationText,
          projectAssignmentText: createListFromHTMLPTags(xmlProgram.purpose.educationObjective.content, xmlProgram),
          coursesAndSubjects: {
            mandatory: parseCourses(xmlProgram.commonMandatory.subject, subjects, courses, xmlProgram),
            program: parseCourses(xmlProgram.commonProgram.subject, subjects, courses, xmlProgram),
            specialization: parseCourses(xmlProgram.specialization.subject, subjects, courses, xmlProgram)
          },
          orientations: parseOrientations(xmlProgram.programOrientations, subjects, courses, degrees, orientationTextMap, xmlProgram),
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
        
        if(programs.has(program.navigationalCode)) {
          navigationallyShiftedPrograms.add(programs.get(program.navigationalCode));
        }
        while(programs.has(program.navigationalCode)) {
          program.navigationalIndex++;
          program.navigationalCode = `${program.code}${program.navigationalIndex+1}`;
        }
        programs.set(program.navigationalCode, program);
      }
      for(let program of navigationallyShiftedPrograms) {
        program.navigationalCode = `${program.code}1`;
      }
      for(let [code, program] of programs) {
        program.url = customProgramUrls[program.navigationalCode];

        assert.isString(program.url, `${code} ${program.title}`);
      }
      return programs;
    });
}