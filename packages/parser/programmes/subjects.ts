import { getSortableCode } from "../utils/sortableCode";

export function readProgramSubjects(inSubjects: any) {
  if (!inSubjects) {
    return { courses: [], subjects: [] };
  }
  const courses: any[] = [];
  const subjects: any[] = [];
  const aliasSubjects: any[] = [];

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

    subjectCourses.sort((a, b) =>
      getSortableCode(a).localeCompare(getSortableCode(b))
    );

    if (
      subject.alias != null &&
      subject.alias[0].toString().toLowerCase() === "true"
    ) {
      aliasSubjects.push({
        code,
        name: subject.name[0],
        optional:
          subject.optional != null &&
          subject.optional[0].toString().toLowerCase() === "true",
        minPoints: Math.max(point, coursePoints),
        courses: [...subjectCourses]
      });
    } else {
      subjects.push({
        code,
        minPoints: Math.max(point, coursePoints),
        courses: [...subjectCourses]
      });
    }
  }
  courses.sort((a, b) => getSortableCode(a).localeCompare(getSortableCode(b)));
  subjects.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );

  return {
    courses,
    subjects,
    aliasSubjects
  };
}
