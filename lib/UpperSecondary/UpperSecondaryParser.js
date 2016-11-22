const path = require("path");
const fs = require("mz/fs");
const targz = require("tar.gz");
const tmp = require("tmp-promise");
tmp.setGracefulCleanup(); //Clean even when we error.

const glob = require("glob");

const ListParser = require("./ListParser.js");

function readGlobFiles(directory, globStr) {
  return new Promise((resolve, reject) => {
    glob(globStr, { cwd: directory, root: directory }, (err, files) => {
      if(err) return reject(err);

      resolve(files);
    });
  }).then(files => {
    let promises = [];
    for(let file of files) {
      promises.push(fs.readFile(path.join(directory, file)));
    }
    return Promise.all(promises);
  })
}
module.exports.parseXML = function parseXML(directory) {
  return readGlobFiles(directory, "*/subjectsAndCourses/*.xml")
    .then(files => {
      return ListParser(files);
    });
}

module.exports.parseTGZ = function parseTGZ(tgzArchiveFile) {
  const filepath = path.resolve(tgzArchiveFile);
  return tmp.dir({ keep: true, unsafeCleanup: true }).then(directory => {
    const targetDirectory = directory.path;
    console.log(`Extracting into ${targetDirectory}`);
    return targz().extract(filepath, targetDirectory)
      .then(() => {
        return module.exports.parseXML(targetDirectory);
      })
      .then((data) => {
        console.log(`Cleaning ${targetDirectory}`);
        directory.cleanup();
        return data;
      });
  });
}