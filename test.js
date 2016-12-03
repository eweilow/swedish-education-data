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
  }).catch(err => {
    assert.fail(err.message, "", err.stack);
  })