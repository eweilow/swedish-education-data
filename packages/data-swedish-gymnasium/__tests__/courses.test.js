describe("course data", () => {
  const allCourses = require("../out/courses.json");

  test("all courses are correct", () => {
    expect(allCourses).toMatchSnapshot();
  });

  for (const { title, file } of allCourses) {
    test(`'${title}' parsed correctly`, () => {
      const read = require(require("path").join(__dirname, "../out", file));
      expect(read).toMatchSnapshot();
    });
  }
});
