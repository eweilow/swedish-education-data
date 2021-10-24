const { join } = require("path");

const dataDirectory = join(process.cwd(), "./data");
const sourceDirectory = join(dataDirectory, "./gyP1_6_S1_4");
const outputDirectory = join(process.cwd(), "./out");
const replacementsDirectory = join(process.cwd(), "./manual");

module.exports = {
  dataDirectory,
  sourceDirectory,
  outputDirectory,
  replacementsDirectory,
};
