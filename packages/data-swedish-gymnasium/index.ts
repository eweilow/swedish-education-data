import { fetchSyllabus } from "@education-data/fetcher";
import { run } from "@education-data/parser";
import { join } from "path";

async function main() {
  console.info("[fetching and extracting data]");
  await fetchSyllabus(join(process.cwd(), "./data"));
  console.info("[parsing program data]");

  await run();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
