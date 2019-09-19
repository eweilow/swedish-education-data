describe("programme data", () => {
  const allProgrammes = require("../out/programmes.json");

  for (const { title, file } of allProgrammes) {
    test(`'${title}' parsed correctly`, () => {
      const read = require(require("path").join(__dirname, "../out", file));
      expect(read).toMatchSnapshot();
    });
  }
});
