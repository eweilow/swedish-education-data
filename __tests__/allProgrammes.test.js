describe("programme data", () => {
  const allProgrammes = require("../out/programmes.json");

  test("all programmes are correct", () => {
    expect(allProgrammes).toMatchSnapshot();
  });
});
