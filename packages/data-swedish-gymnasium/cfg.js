const { join } = require("path");

const dataDirectory = join(process.cwd(), "./data");
const sourceDirectory = join(dataDirectory, "./syllabus/gyP1_7_S1_4");
const outputDirectory = join(process.cwd(), "./out");
const replacementsDirectory = join(process.cwd(), "./manual");

module.exports = {
  dataDirectory,
  sourceDirectory,
  outputDirectory,
  replacementsDirectory,
};
