import fetch from "node-fetch";

export async function fetchData(name: string) {
  const rawData = await fetch(name);
  const buffer = await rawData.buffer();
  return buffer;
}
