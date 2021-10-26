import { dataDirectory, rawDirectory } from "./cfg";

import {
  normalizeSubjects,
  normalizeCourses,
} from "@education-data/normalizer";

async function main() {
  console.info("\n[normalizing subjects]");
  await normalizeSubjects(rawDirectory, dataDirectory);

  console.info("\n[normalizing courses]");
  await normalizeCourses(rawDirectory, dataDirectory);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
