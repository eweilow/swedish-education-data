import { fetchSyllabus } from "@education-data/fetcher";
import { parseProgrammes } from "@education-data/parser";
import { join } from "path";

async function main() {
  const dataDirectory = join(process.cwd(), "./data");
  const sourceDirectory = join(dataDirectory, "./gyP1_7_S1_4");
  const outputDirectory = join(process.cwd(), "./out");
  const replacementsDirectory = join(process.cwd(), "./manual");

  console.info("\n[fetching and extracting data]");
  await fetchSyllabus(dataDirectory);

  console.info("\n[parsing program data]");
  await parseProgrammes(
    sourceDirectory,
    outputDirectory,
    replacementsDirectory
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
