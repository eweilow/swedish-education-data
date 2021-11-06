import { dataDirectory, outputDirectory, rawDirectory } from "./cfg";

import { parseSubjects, parseCourses } from "@education-data/parser";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.info("\n[parsing subjects]");
  await parseSubjects(dataDirectory, outputDirectory);

  console.info("\n[parsing courses]");
  await parseCourses(dataDirectory, outputDirectory);

  writeFileSync(
    join(outputDirectory, "./meta.json"),
    readFileSync(join(rawDirectory, "./meta.json"))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
