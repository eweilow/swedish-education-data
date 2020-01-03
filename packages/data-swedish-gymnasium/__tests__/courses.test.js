describe("course data", () => {
  const allCourses = require("../out/courses.json");

  for (const { title, file } of allCourses) {
    test(`'${title}' parsed correctly`, () => {
      const read = require(require("path").join(__dirname, "../out", file));
      expect(read).toMatchSnapshot();
    });
  }
});
