import {
  parseProgrammes,
  parseSubjects,
  parseCourses,
} from "@education-data/parser";
import { join } from "path";
import { writeFileSync } from "fs";

import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { sourceDirectory, outputDirectory, replacementsDirectory } from "./cfg";

async function main() {
  console.info("\n[parsing subject data]");
  await parseSubjects(sourceDirectory, outputDirectory, replacementsDirectory);

  console.info("\n[parsing course data]");
  await parseCourses(
    {
      get(code: string) {
        const subjects = require("./out/subjects.json");
        const name = subjects.find((el) => el.code === code);
        return require(join(process.cwd(), "./out", name.file));
      },
    } as Map<string, any>,
    sourceDirectory,
    outputDirectory,
    replacementsDirectory
  );

  console.info("\n[parsing program data]");
  await parseProgrammes(
    sourceDirectory + "/../gyP1_6_S1_4",
    outputDirectory,
    replacementsDirectory
  );
  p;

  writeFileSync(
    "./out/meta.json",
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
