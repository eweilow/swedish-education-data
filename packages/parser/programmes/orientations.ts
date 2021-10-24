import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";
import { normalizeHTML } from "../utils/normalizeHtml";
import { assert } from "chai";

export function readProgramOrientations(
  manualReplacements: any,
  html: string,
  data: any
) {
  html = normalizeHTML(html.trim());
  setValueIfExists(
    manualReplacements["program.info.orientation.html"],
    (value) => checkTextEquality(html, value.join("\n")),
    (value) => {
      html = normalizeHTML(value.join("\n"));
    }
  );

  const orientations = [...html.matchAll(/\<p\>((?:\n|.)*?)\<\/p\>/gm)];

  const possibleStrings = orientations.map((el) => el[1]);
  const countOfSuitableStrings = possibleStrings.map(
    (el) =>
      [...el.matchAll(/(Inriktningen|Profilen)(?:\s|\n)*\<italic\>/gm)].length
  );

  const erronousStrings = possibleStrings.filter(
    (_, i) => countOfSuitableStrings[i] > 1
  );
  if (erronousStrings.length > 0) {
    throw new Error(
      `The orientation HTML in program '${
        data.title[0]
      }' (${data.code[0].trim()}) cannot be used to extract information about orientations:\n | ` +
        html.replace(/\n/g, "\n | ")
    );
  }

  const usableStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 1)
    .map((el) => normalizeHTML(el));

  const restStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 0)
    .map((el) => normalizeHTML(el));

  const programOrientations = data.programOrientations[0].programOrientation;
  const profiles = data.profiles[0].profile;
  //const programOrientations = data.programOrientations[0].programOrientation

  if (programOrientations != null) {
    assert.equal(
      usableStrings.length,
      programOrientations.length,
      `count of programOrientations should match orientation HTML in program ${data.code[0].trim()}`
    );
  } else if (profiles != null) {
    assert.equal(
      usableStrings.length,
      profiles.length,
      `count of profiles should match orientation HTML in program ${data.code[0].trim()}`
    );
  } else {
    assert.equal(
      usableStrings.length,
      0,
      "A program without programOrientations or profiles should have no matched HTML"
    );
  }

  html = normalizeHTML(restStrings.map((el) => `<p>${el}</p>`).join("\n"));

  return html;
}
