import { fetchSyllabus } from "@education-data/fetcher";

import { rawDirectory } from "./cfg";

import { format } from "date-fns";
import { sv } from "date-fns/locale";

import * as prettier from "prettier";
import * as glob from "glob";
import { promises, writeFileSync } from "fs";
import { join, relative } from "path";

import * as xmlPlugin from "@prettier/plugin-xml";

async function main() {
  console.info("\n[fetching and extracting data]");
  await fetchSyllabus(
    "https://opendata.skolverket.se/data/syllabus.tgz",
    rawDirectory
  );

  console.info("\n[formatting files]");

  for (const file of [
    ...glob.sync("**/*.xml", {
      cwd: rawDirectory,
      absolute: true,
    }),
  ]) {
    try {
      await promises.writeFile(
        file,
        prettier.format(await promises.readFile(file, "utf-8"), {
          filepath: relative(rawDirectory, file),
          ...({
            xmlWhitespaceSensitivity: "ignore",
          } as any),
          plugins: [xmlPlugin],
        })
      );
    } catch (err) {
      console.error(err);
    }
  }

  writeFileSync(
    join(rawDirectory, "./meta.json"),
    JSON.stringify({
      fetchTime: new Date().toISOString(),
      humanizedFetchTime: format(new Date(), "do LLLL, yyyy", {
        locale: sv,
      }),
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
