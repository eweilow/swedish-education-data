const index = require("./index.js");
const assert = require("chai").assert;
index.UpperSecondary.parseTGZ("./src/syllabus.tgz")
  .then(upperSecondaryData => {
    assert.isDefined(upperSecondaryData);
    assert.isDefined(upperSecondaryData.courses);
    assert.isDefined(upperSecondaryData.subjects);
    assert.isDefined(upperSecondaryData.programs);
    assert.isAtLeast(upperSecondaryData.courses.size, 1);
    assert.isAtLeast(upperSecondaryData.subjects.size, 1);
    assert.isAtLeast(upperSecondaryData.programs.size, 1);
    /*
    const fs = require("mz/fs");
    const path = require("path");
    const mkdirp = require("mkdirp");
    const rimraf = require("rimraf");

    rimraf.sync("./build/");      
    mkdirp.sync("./build/subjects");
    mkdirp.sync("./build/courses");
    mkdirp.sync("./build/programs");
    let writes = [];
    for(let [code, subject] of upperSecondaryData.subjects) {
      writes.push(fs.writeFile(path.join("./build/subjects", `${code}.json`), JSON.stringify(subject, null, "  ")));
    }
    for(let [code, course] of upperSecondaryData.courses) {
      writes.push(fs.writeFile(path.join("./build/courses", `${code}.json`), JSON.stringify(course, null, "  ")));
    }
    for(let [code, program] of upperSecondaryData.programs) {
      writes.push(fs.writeFile(path.join("./build/programs", `${code}.json`), JSON.stringify(program, null, "  ")));
    }*/
  }).catch(err => {
    assert.fail(err.message, "", err.stack);
  })