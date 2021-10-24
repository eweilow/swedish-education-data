const { join } = require("path");

const dataDirectory = join(process.cwd(), "./data");
const sourceDirectory = join(dataDirectory, "./gyP4_0_S3_0");
const outputDirectory = join(process.cwd(), "./out");
const replacementsDirectory = join(process.cwd(), "./manual");

module.exports = {
  dataDirectory,
  sourceDirectory,
  outputDirectory,
  replacementsDirectory,
};
