import { fetchData } from "./fetch";
import { exportArchive } from "./export";

export async function fetchSyllabus(archiveFile: string, directory: string) {
  const data = await fetchData(archiveFile);

  await exportArchive(data, directory);
}
