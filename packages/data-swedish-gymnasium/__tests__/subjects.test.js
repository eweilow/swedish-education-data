describe("subject data", () => {
  const allSubjects = require("../out/subjects.json");

  test("all subjects are correct", () => {
    expect(allSubjects).toMatchSnapshot();
  });

  for (const { title, file } of allSubjects) {
    test(`'${title}' parsed correctly`, () => {
      const read = require(require("path").join(__dirname, "../out", file));
      expect(read).toMatchSnapshot();
    });
  }
});
