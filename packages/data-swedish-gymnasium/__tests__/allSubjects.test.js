describe("subject data", () => {
  const allSubjects = require("../out/subjects.json");

  test("all subjects are correct", () => {
    expect(allSubjects).toMatchSnapshot();
  });
});
