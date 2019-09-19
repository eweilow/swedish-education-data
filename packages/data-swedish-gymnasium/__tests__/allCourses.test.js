describe("course data", () => {
  const allCourses = require("../out/courses.json");

  test("all courses are correct", () => {
    expect(allCourses).toMatchSnapshot();
  });
});
