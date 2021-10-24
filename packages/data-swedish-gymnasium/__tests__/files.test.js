const glob = require("glob");
const {
  outputDirectory,
  dataDirectory,
  replacementsDirectory,
  sourceDirectory,
} = require("../cfg");

describe("files", () => {
  test("outputDirectory has right files", () => {
    const allFiles = glob.sync("**", { cwd: outputDirectory });
    expect(allFiles).toMatchSnapshot();
  });
  test("dataDirectory has right files", () => {
    const allFiles = glob.sync("**", { cwd: dataDirectory });
    expect(allFiles).toMatchSnapshot();
  });
  test("replacementsDirectory has right files", () => {
    const allFiles = glob.sync("**", { cwd: replacementsDirectory });
    expect(allFiles).toMatchSnapshot();
  });
  test("sourceDirectory has right files", () => {
    const allFiles = glob.sync("**", { cwd: sourceDirectory });
    expect(allFiles).toMatchSnapshot();
  });
});
