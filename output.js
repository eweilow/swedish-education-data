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

    const fs = require("mz/fs");
    const path = require("path");
    const mkdirp = require("mkdirp");
    const rimraf = require("rimraf");

    const buildPath = "./build/";
    rimraf.sync(buildPath);      
    mkdirp.sync(path.join(buildPath, "/subjects"));
    mkdirp.sync(path.join(buildPath, "/courses"));
    mkdirp.sync(path.join(buildPath, "/programs"));
    let writes = [];

    let indices = {
      courses: [],
      subjects: [],
      programs: []
    };
    for(let [code, course] of upperSecondaryData.courses) {
      let filepath = path.join(buildPath, "/courses", `${code}.json`);
      indices.courses.push(filepath);
      writes.push(fs.writeFile(filepath, JSON.stringify(course, null, "  ")));
    }
    for(let [code, subject] of upperSecondaryData.subjects) {
      let filepath = path.join(buildPath, "/subjects", `${code}.json`);
      indices.subjects.push(filepath);
      writes.push(fs.writeFile(filepath, JSON.stringify(subject, null, "  ")));
    }
    for(let [code, program] of upperSecondaryData.programs) {
      let filepath = path.join(buildPath, "/programs", `${code}.json`);
      indices.programs.push(filepath);
      writes.push(fs.writeFile(filepath, JSON.stringify(program, null, "  ")));
    }
    writes.push(fs.writeFile(path.join(buildPath, "indices.json"), JSON.stringify(indices, null, "  ")));

    return Promise.all(writes);
  }).catch(err => {
    assert.fail(err.message, "", err.stack);
  })