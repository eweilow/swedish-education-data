import { fetchData } from "./fetch";
import { exportArchive } from "./export";

export async function fetchSyllabus(directory: string) {
  const data = await fetchData(
    "https://opendata.skolverket.se/data/gamla%20filer/gyP1_6_S1_4.tgz"
  );

  await exportArchive(data, directory);
}
