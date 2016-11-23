const index = require("./index.js");
const assert = require("chai").assert;
index.UpperSecondary.parseTGZ("./src/syllabus.tgz")
  .then(upperSecondaryData => {
    //assert.isDefined(upperSecondaryData);
    //console.log(upperSecondaryData);
  }).catch(err => {
    assert.fail(err.message, "", err.stack);
  })