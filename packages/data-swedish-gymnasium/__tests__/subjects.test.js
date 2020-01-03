describe("subject data", () => {
  const allSubjects = require("../out/subjects.json");

  for (const { title, file } of allSubjects) {
    test(`'${title}' parsed correctly`, () => {
      const read = require(require("path").join(__dirname, "../out", file));
      expect(read).toMatchSnapshot();
    });
  }
});
