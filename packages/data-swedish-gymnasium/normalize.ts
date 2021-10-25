import { dataDirectory, rawDirectory } from "./cfg";

import { normalizeSubjects } from "@education-data/normalizer";

async function main() {
  console.info("\n[normalizing subjects]");
  await normalizeSubjects(rawDirectory, dataDirectory);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
