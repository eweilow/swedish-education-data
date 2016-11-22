const index = require("./index.js");
const assert = require("chai").assert;
index.UpperSecondary.parseTGZ("./src/syllabus.tgz")
  .then(upperSecondaryData => {
    assert.isDefined(upperSecondaryData.courses);
    assert.isDefined(upperSecondaryData.subjects);
    //console.log(upperSecondaryData);
  }).catch(err => {
    assert.fail(err);
  })