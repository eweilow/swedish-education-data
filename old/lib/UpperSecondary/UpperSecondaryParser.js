const path = require("path");
const fs = require("mz/fs");
const targz = require("tar.gz");
const tmp = require("tmp-promise");
tmp.setGracefulCleanup(); //Clean even when we error.

const glob = require("glob");

const ListParser = require("./ListParser.js");
const SubjectsParser = require("./SubjectsParser.js");
const ProgramsParser = require("./ProgramsParser.js");

function readGlobFiles(...array) {
  let globPromises = [];
  for(let [directory, globStr, tag = false] of array) {
    globPromises.push(new Promise((resolve, reject) => {
      glob(globStr, { cwd: directory, root: directory }, (err, files) => {
        if(err) return reject(err);

        resolve({directory: directory, files: files, tag: tag});
      });
    }));
  }
  return Promise.all(globPromises)
  .then(fileArrays => {
    let promises = [];
    for(let {files, directory, tag} of fileArrays) {
      for(let file of files) {
        promises.push(fs.readFile(path.join(directory, file)).then(contents => {
          return { contents: contents, tag: tag };
        }));
      }
    }
    return Promise.all(promises);
  })
}

module.exports.parseXML = function parseXML(directory, manualDirectory) {
  return readGlobFiles([directory, "*/subjectsAndCourses/*.xml"])
    .then(files => ListParser(files.map(el => el.contents)))
    .then(subjectsAndCourses => {
      return readGlobFiles([directory, "*/program/*.xml"])
        .then(files => ProgramsParser(files.map(el => el.contents), subjectsAndCourses.subjects, subjectsAndCourses.courses))
        .then(programData => {
          return readGlobFiles([manualDirectory, "subject/*.xml", "manual"], [directory, "*/subject/*.xml"])
            .then(subjectFiles => SubjectsParser(subjectFiles, subjectsAndCourses.subjects, subjectsAndCourses.courses))
            .then(subjectsData => {
              return {
                subjects: subjectsData.subjects,
                courses: subjectsData.courses,
                programs: programData
              }
            });
        });
    });
  
}

module.exports.parseTGZ = function parseTGZ(tgzArchiveFile, manualDirectory) {
  const filepath = path.resolve(tgzArchiveFile);
  return tmp.dir({ keep: true, unsafeCleanup: true }).then(directory => {
    const targetDirectory = directory.path;
    console.log(`Extracting into ${targetDirectory}`);
    return targz().extract(filepath, targetDirectory)
      .then(() => {
        return module.exports.parseXML(targetDirectory, manualDirectory);
      })
      .then((data) => {
        console.log(`Cleaning ${targetDirectory}`);
        directory.cleanup();
        return data;
      });
  });
}