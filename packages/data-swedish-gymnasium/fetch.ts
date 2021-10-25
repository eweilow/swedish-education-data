import { fetchSyllabus } from "@education-data/fetcher";

import { rawDirectory } from "./cfg";

import * as prettier from "prettier";
import * as glob from "glob";
import { readFileSync, writeFileSync } from "fs";

async function main() {
  console.info("\n[fetching and extracting data]");
  await fetchSyllabus(
    "https://opendata.skolverket.se/data/syllabus.tgz",
    rawDirectory
  );

  console.info("\n[formatting files]");

  for (const file of glob.sync("**/*.xml", {
    cwd: rawDirectory,
    absolute: true,
  })) {
    writeFileSync(
      file,
      prettier.format(readFileSync(file, "utf-8"), {
        filepath: file,
        xmlWhitespaceSensitivity: "ignore",
      } as any)
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
