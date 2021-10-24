import { file } from "tmp-promise";
import { promises } from "fs";
import { extract } from "tar";
import { sync as mkdirp } from "mkdirp";

export async function exportArchive(buffer: Buffer, directory: string) {
  const { path, cleanup } = await file();

  try {
    await promises.writeFile(path, buffer);
    mkdirp(directory);
    await extract({
      file: path,
      cwd: directory,
    });
  } finally {
    await cleanup();
  }
}
