const xml2js = require("xml2js");
const assert = require("chai").assert;

function parseXML(str) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(str, { explicitArray: false }, (err, result) => {
      if(err) return reject(err);
      resolve(result);
    })
  })
}

module.exports = function parseSubjectsAndCoursesList(files) {
  let xmlParsePromises = [];
  for(let fileContents of files) {
    xmlParsePromises.push(parseXML(fileContents.toString()));
  }
  return Promise.all(xmlParsePromises)
    .then((xmlFiles) => {
      let subjects = new Map();
      let courses = new Map();
      for(let xml of xmlFiles) {
        if(!Array.isArray(xml.SubjectsAndCourses.subject)) xml.SubjectsAndCourses.subject = [xml.SubjectsAndCourses.subject];
        assert.isArray(xml.SubjectsAndCourses.subject);

        for(let subject of xml.SubjectsAndCourses.subject) {
          const context = `in subject ${subject.code}`;
          let subjectCourses = new Map();
          subject.name = subject.name.replace(/\n/gi, "").trim();

          if(!Array.isArray(subject.courses)) subject.courses = [subject.courses];
          assert.isArray(subject.courses, context);
          
          for(let course of subject.courses) {
            course.name = course.name.replace(/\n/gi, "").trim();
            const context = `in course ${course.code}`;

            let courseObject = {
              title: course.name.trim().replace(/–/g, "-"),
              code: course.code.trim(),
              points: parseInt(course.point)
            };

            assert.isString(course.code, context);
            assert.isString(course.name, context);
            assert.isString(course.point, context);
            assert.isNumber(courseObject.points, context);
            assert.isNotNaN(courseObject.points, context);
            //assert.isAtMost(course.name.length, 50, `${course.name} ${context}`); this validation should happen in the application itself
            
            subjectCourses.set(courseObject.code, courseObject);
            courses.set(courseObject.code, courseObject);
          }
          assert.isString(subject.code, context);
          assert.isString(subject.name, context);
          assert.isAtLeast(subjectCourses.size, 1, context);
          //assert.isAtMost(subject.name.length, 50, `${subject.name} ${context}`); this validation should happen in the application itself
          
          subjects.set(subject.code.trim(), {
            code: subject.code.trim(),
            title: subject.name.trim().replace(/–/g, "-"),
            courses: subjectCourses.values()
          });
        }
      }

      assert.isAtLeast(subjects.size, 1, "no subjects parsed");
      assert.isAtLeast(courses.size, 1, "no courses parsed");

      return {
        subjects: subjects,
        courses: courses
      }
    });
}