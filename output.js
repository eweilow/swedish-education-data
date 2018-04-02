const index = require("./index.js");
const assert = require("chai").assert;

const fs = require("mz/fs");
const path = require("path");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");

const fetch = require("node-fetch");

async function fetchFiles() {
  console.info("Fetching syllabus");
  const syllabus = await fetch(
    "http://opendata.skolverket.se/data/syllabus.tgz"
  );
  const syllabusBuffer = await syllabus.buffer();
  await fs.writeFile(
    path.join(__dirname, "./src/syllabus.tgz"),
    syllabusBuffer
  );
  console.log("Done.");

  console.info("Fetching compulsory");
  const compulsory = await fetch(
    "http://opendata.skolverket.se/data/compulsory.tgz"
  );
  const compulsoryBuffer = await compulsory.buffer();
  await fs.writeFile(
    path.join(__dirname, "./src/compulsory.tgz"),
    compulsoryBuffer
  );
  console.log("Done.");
}

async function run() {
  await fetchFiles();

  const upperSecondaryData = await index.UpperSecondary.parseTGZ(
    "./src/syllabus.tgz",
    "./manual"
  );

  assert.isDefined(upperSecondaryData);
  assert.isDefined(upperSecondaryData.courses);
  assert.isDefined(upperSecondaryData.subjects);
  assert.isDefined(upperSecondaryData.programs);
  assert.isAtLeast(upperSecondaryData.courses.size, 1);
  assert.isAtLeast(upperSecondaryData.subjects.size, 1);
  assert.isAtLeast(upperSecondaryData.programs.size, 1);

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
  for (let [code, course] of upperSecondaryData.courses) {
    let filepath = path.join(buildpath, "/courses", `${code}.json`);
    indices.courses.push(path.relative(buildpath, filepath));
    writes.push(fs.writeFile(filepath, JSON.stringify(course, null, "  ")));
  }
  for (let [code, subject] of upperSecondaryData.subjects) {
    let filepath = path.join(buildpath, "/subjects", `${code}.json`);
    indices.subjects.push(path.relative(buildpath, filepath));
    writes.push(fs.writeFile(filepath, JSON.stringify(subject, null, "  ")));
  }
  for (let [code, program] of upperSecondaryData.programs) {
    let filepath = path.join(
      buildpath,
      "/programs",
      `${program.navigationalCode}.json`
    );
    indices.programs.push(path.relative(buildpath, filepath));
    writes.push(fs.writeFile(filepath, JSON.stringify(program, null, "  ")));
  }
  writes.push(
    fs.writeFile(
      path.join(buildpath, "indices.json"),
      JSON.stringify(indices, null, "  ")
    )
  );

  return Promise.all(writes);
}

run()
  .then(() => console.log("\nDONE"))
  .catch(err => {
    console.error(`\nError: '${err.message}'\n${err.stack}`);
  });
