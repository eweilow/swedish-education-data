import { existsSync } from "fs";

import { relative } from "path";

export async function getReplacements(replacementFile: string) {
  let manualReplacements = {};
  const found = existsSync(replacementFile);

  if (found) {
    console.log(
      `Replacement ${relative(
        process.cwd(),
        replacementFile
      )}: found replacements`
    );
    manualReplacements = require(replacementFile);
    for (const key of Object.keys(manualReplacements)) {
      console.log(` - ${key}`);
    }
  }

  return manualReplacements;
}
