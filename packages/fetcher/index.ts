import { fetchData } from "./fetch";
import { exportArchive } from "./export";

export async function fetchSyllabus(directory: string) {
  const data = await fetchData(
    "https://opendata.skolverket.se/data/syllabus.tgz"
  );

  await exportArchive(data, directory);
}
