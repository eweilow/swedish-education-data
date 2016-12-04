const index = require("./index.js");
const assert = require("chai").assert;
index.UpperSecondary.parseTGZ("./src/syllabus.tgz", "./manual")
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

    const buildpath = "./build/";
    rimraf.sync(buildpath);      
    mkdirp.sync(path.join(buildpath, "/subjects"));
    mkdirp.sync(path.join(buildpath, "/courses"));
    mkdirp.sync(path.join(buildpath, "/programs"));
    let writes = [];

    let indices = {
      courses: [],
      subjects: [],
      programs: []
    };
    for(let [code, course] of upperSecondaryData.courses) {
      let filepath = path.join(buildpath, "/courses", `${code}.json`);
      indices.courses.push(path.relative(buildpath, filepath));
      writes.push(fs.writeFile(filepath, JSON.stringify(course, null, "  ")));
    }
    for(let [code, subject] of upperSecondaryData.subjects) {
      let filepath = path.join(buildpath, "/subjects", `${code}.json`);
      indices.subjects.push(path.relative(buildpath, filepath));
      writes.push(fs.writeFile(filepath, JSON.stringify(subject, null, "  ")));
    }
    for(let [code, program] of upperSecondaryData.programs) {
      let filepath = path.join(buildpath, "/programs", `${code}.json`);
      indices.programs.push(path.relative(buildpath, filepath));
      writes.push(fs.writeFile(filepath, JSON.stringify(program, null, "  ")));
    }
    writes.push(fs.writeFile(path.join(buildpath, "indices.json"), JSON.stringify(indices, null, "  ")));

    return Promise.all(writes);
  }).catch(err => {
    assert.fail(err.message, "", err.stack);
  })