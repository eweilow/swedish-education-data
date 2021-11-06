import { dataDirectory, outputDirectory } from "./cfg";

import { parseSubjects, parseCourses } from "@education-data/parser";

async function main() {
  console.info("\n[parsing subjects]");
  await parseSubjects(dataDirectory, outputDirectory);

  console.info("\n[parsing courses]");
  await parseCourses(dataDirectory, outputDirectory);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
