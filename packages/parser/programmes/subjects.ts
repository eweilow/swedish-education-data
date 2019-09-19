export function readProgramSubjects(inSubjects: any) {
  if (!inSubjects) {
    return { courses: [], subjects: [] };
  }
  const courses: any[] = [];
  const subjects: any[] = [];

  for (const subject of inSubjects) {
    if (typeof subject !== "object") {
      continue;
    }
    // const name = subject.name[0];
    const code = subject.code[0];
    const point = subject.point != null ? parseInt(subject.point[0], 10) : 0;
    const subjectCourses: any[] = [];

    let coursePoints = 0;
    for (const course of subject.course || []) {
      if (!courses.includes(course.code[0])) {
        courses.push(course.code[0]);
      }
      subjectCourses.push(course.code[0]);
      coursePoints += parseInt(course.point[0], 10);
    }

    subjects.push({
      code,
      minPoints: Math.max(point, coursePoints),
      courses: subjectCourses
    });
  }

  return {
    courses,
    subjects
  };
}
