import { setValueIfExists } from "../utils/setValueIfExists";
import { checkTextEquality } from "../utils/matchText";
import { normalizeHTML } from "../utils/normalizeHtml";
import { assert } from "chai";

export function readProgramOrientations(
  manualReplacements: any,
  data: any,
  program: any
) {
  setValueIfExists(
    manualReplacements["program.info.orientation.html"],
    value => checkTextEquality(program.info.orientation.html, value.join("\n")),
    value => {
      program.info.orientation.html = normalizeHTML(value.join("\n"));
    }
  );

  const orientations = [
    ...program.info.orientation.html.matchAll(/\<p\>((?:\n|.)*?)\<\/p\>/gm)
  ];

  const possibleStrings = orientations.map(el => el[1]);
  const countOfSuitableStrings = possibleStrings.map(
    el =>
      [...el.matchAll(/(Inriktningen|Profilen)(?:\s|\n)*\<italic\>/gm)].length
  );

  const erronousStrings = possibleStrings.filter(
    (_, i) => countOfSuitableStrings[i] > 1
  );
  if (erronousStrings.length > 0) {
    throw new Error(
      `The orientation HTML in program '${program.title}' (${program.code}) cannot be used to extract information about orientations:\n | ` +
        program.info.orientation.html.replace(/\n/g, "\n | ")
    );
  }

  const usableStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 1)
    .map(el => normalizeHTML(el));

  const restStrings = possibleStrings
    .filter((_, i) => countOfSuitableStrings[i] === 0)
    .map(el => normalizeHTML(el));

  const programOrientations = data.programOrientations[0].programOrientation;
  const profiles = data.profiles[0].profile;
  //const programOrientations = data.programOrientations[0].programOrientation

  if (programOrientations != null) {
    assert.equal(
      usableStrings.length,
      programOrientations.length,
      `count of programOrientations should match orientation HTML in program ${program.code}`
    );
  } else if (profiles != null) {
    assert.equal(
      usableStrings.length,
      profiles.length,
      `count of profiles should match orientation HTML in program ${program.code}`
    );
  } else {
    assert.equal(
      usableStrings.length,
      0,
      "A program without programOrientations or profiles should have no matched HTML"
    );
  }

  program.info.orientation.html = normalizeHTML(
    restStrings.map(el => `<p>${el}</p>`).join("\n")
  );
}
