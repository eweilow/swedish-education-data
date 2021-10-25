const { join } = require("path");

const rawDirectory = join(process.cwd(), "./data/raw");
const dataDirectory = join(process.cwd(), "./data/normalized");

const sourceDirectory = join(dataDirectory, "./gyP4_0_S3_0");
const outputDirectory = join(process.cwd(), "./out");
const replacementsDirectory = join(process.cwd(), "./manual");

module.exports = {
  rawDirectory,
  dataDirectory,
  sourceDirectory,
  outputDirectory,
  replacementsDirectory,
};
