const assert = require("chai").assert;
const cheerio = require("cheerio");
const distance = require("jaro-winkler");

function parseCentralContent(centralContent, xmlCourse) {
  let context = `in course ${xmlCourse.code}`;
  assert.isString(centralContent, context);
  let $ = cheerio.load(centralContent);

  let notValidelements = $(":not(p):not(h4):not(l):not(li):not(strong):not(italic):not(br)");
  let notValidElementsString = "none invalid";
  if(notValidelements.length > 0) {
    const tags = new Set();
    notValidelements.each((index, element) => {
      tags.add(element.tagName.trim().toLowerCase());
    });
    notValidElementsString = Array.from(tags).join(", ");
  } 
  assert.equal(notValidelements.length, 0, context + " (" + notValidElementsString + ")");
  //assert.equal($("h4").length, 1, context);
  assert.isAtLeast($("l").length, 1, context);
  let parseElements = $.root().children("p,l");

  let categories = {};
  
  let currentCategory = "";
  let currentItems = [];
  parseElements.each((index, element) => {
    let cheerioElement = $(element);
    if(element.tagName.toLowerCase() === "p") {
      let text = cheerioElement.text().trim();
      if(!text) return;

      if(text.indexOf("Undervisningen i kursen ska behandla följande centrala innehåll") >= 0) return;

      if(currentItems.length) {
        categories[currentCategory] = currentItems;
      }
      currentItems = [];
      currentCategory = text;
    } else if(element.tagName.toLowerCase() === "l") {
      cheerioElement.children("li").each((index, element) => {
        let text = $(element).text().trim();
        if(!text) return;
        currentItems.push(text);
      });
    }
  });
  if(currentItems.length) {
    categories[currentCategory] = currentItems;
  } 

  assert.isAtLeast(Object.keys(categories).length, 1, context);

  return categories;
}

function parseDescription(description, context) {
  let $ = cheerio.load(description);

  let text = [];
  let tags = $("p");
  assert.equal(tags.length, $.root().children("*").length, context);

  tags.each((index, element) => {
    text.push($(element).text().trim());
  });
  return text.join("\n");
}

const mustMatchGrades = ["E", "C", "A"]; //The grade steps which must have equal length
/* Used when knowledge requirements from E span to A */
function createDuplicates(knowledgeRequirements, xmlCourse) {
  let context = `in course ${xmlCourse.code}`;

  let mustFix = false;
  let baseGrade = "E";
  for(let grade of mustMatchGrades.slice(1)) {
    if(knowledgeRequirements[grade].length !== knowledgeRequirements[baseGrade].length) {
      mustFix = true;
    }
    base = grade;
  }

  if(mustFix) {
    console.log("Automatically fixing criteria in " + xmlCourse.code);
  } else return knowledgeRequirements;
  
  function index(row) {
    return row.map(a => a.replace(/(\s?\*\+\*.*?\*\-\*\s?)/, " ").slice(0, 50));
  }

  let selectorGrade = "E";
  for(let grade of mustMatchGrades.slice(1)) {
    let selectionRow = knowledgeRequirements[selectorGrade];
    let selectorIndices = index(selectionRow);
    
    let row = knowledgeRequirements[grade];
    if(row.length !== selectorIndices.length) {
      let indexed = index(row);

      let equalIndices = new Map();
      for(let item of indexed) {
        for(let otherItem of selectorIndices) {
          let stringDistance;
          if(item === otherItem) {
            stringDistance = 1;
          } else {
            stringDistance = distance(item, otherItem);
          }
          if(stringDistance > 0.95) { //basically equal
            if(row.length > selectorIndices.length) {
              equalIndices.set(indexed.indexOf(item), selectorIndices.indexOf(otherItem));
            } else {
              equalIndices.set(selectorIndices.indexOf(otherItem), indexed.indexOf(item));
            }
          }
        }
      }

      if(row.length > selectorIndices.length) {
        let newRow = [];
        for(let i = 0; i < row.length; i++) {
          if(equalIndices.has(i)) {
            newRow.push(selectionRow[equalIndices.get(i)]);
          } else {
            newRow.push("");
          }
        }
        assert.equal(newRow.length, row.length, context);
        knowledgeRequirements[selectorGrade] = newRow;
      } else {
        let newRow = [];
        for(let i = 0; i < selectionRow.length; i++) {
          if(equalIndices.has(i)) {
            newRow.push(row[equalIndices.get(i)]);
          } else {
            newRow.push(selectionRow[i]);
          }
        }
        assert.equal(newRow.length, selectionRow.length, context);
        knowledgeRequirements[grade] = newRow;
      }
    }
    selectorGrade = grade;
  }
  return knowledgeRequirements;
}

function parseKnowledgeRequirements(knowledgerequirements, xmlCourse) {
  let context = `in course ${xmlCourse.code}`;
  
  knowledgerequirements.sort((a, b) => a.gradeStep.localeCompare(b.gradeStep));
  let grades = {};
  for(let gradeStep of knowledgerequirements) {
    assert.isString(gradeStep.gradeStep, context);
    assert.isString(gradeStep.text, context);
    assert.isFalse(grades.hasOwnProperty(gradeStep.gradeStep), context);

    let $ = cheerio.load(gradeStep.text);
    
    let tags_h4 = $.root().children("h4");
    let tags_p = $.root().children("p");
    let children = $.root().children();
    assert.equal(tags_h4.length, 1, context);
    assert.equal(tags_p.length + tags_h4.length, children.length, context); //Make sure there's only one h4 and the rest p tags in the root scope.
    
    let grade = [ ];
    tags_p.each((index, element) => {
      let cheerioElement = $(element);
      let html = cheerioElement.html().replace(/<strong>(\s)*/g, (whole, whitespace) => {
        return (whitespace || "") + "*+*";
      }).replace(/(\s)*<\/strong>/g, (whole, whitespace) => {
        return "*-*" + (whitespace || "");
      })
      let string = cheerioElement.html(html).text();
      for(let substring of string.split(/(När eleven samråder.*)/)) {
        if(!substring) continue;
        grade.push(substring.trim());
      }

    });
    grades[gradeStep.gradeStep] = grade.filter(row => !!row);
  }
  
  return createDuplicates(grades, xmlCourse);
}


const manualPointsFix = {
  "BIGBIG00S": {
    "Om specialiseringen handlar om mark och växter:": [ 1, 2, 5, 6, 8 ],
    "Om specialiseringen handlar om djur:": [ 3, 4, 5, 6, 8 ],
    "Om kursen handlar om bevarandebiologi:": [ 7 ]
  }
};

function parsePointsRange(description, course) {
  let str = /Kursen\s+(?:\S*.*?omfattar\s*)(.*)?under rubriken Ämne/g.exec(description);
  if(!str || str.length < 2) {
    return [];
  }
  str = str[1];

  if(str.indexOf("eller") >= 0) {
    if(manualPointsFix.hasOwnProperty(course.code)) {
      const fix = manualPointsFix[course.code];
      console.log("Using manual fix of course scale in " + course.code); 
      let result = [];
      for(let key in fix) {
        if(fix.hasOwnProperty(key)) {
          result.push({ key: key, entries: fix[key] });
        }
      }
      return result;
    }
    console.log("Manual fix required of course scale in " + course.code); 
    return [];
  }
  let regexp = /([0-9]+(?:\S[0-9]+)|[0-9]+)/g;

  let results = new Set();
  let match = null;
  while(match = regexp.exec(str)) {
    let start = 0;
    let end = 0;
    
    match = match[0];
    let split = match.replace(/\D+/g, "-").split("-");
    if(split.length === 1) { //single
      start = end = parseInt(match);
    } else { //range
      start = parseInt(split[0]);
      end = parseInt(split[1]);
    }
    for(let i = start; i <= end; i++) {
      results.add(i);
    }
  }

  return [ { key: "", entries: Array.from(results) } ];
}

function convertPointRangesIntoText(pointsRange, subject, xmlCourse) {
  //If there's entries (indexed starting at 1) with no matching entry in the subject development areas
  if(pointsRange.some((row) => row.entries.some((entryIndex) => !subject.purpose.items[entryIndex-1]))) {
    console.warn("Invalid scopes detected in " + xmlCourse.code);
  }
  pointsRange.forEach((row) => {
    row.entries = row.entries.map((entry) => subject.purpose.items[entry-1]);
  });

  let result = {};
  for(let item of pointsRange) {
    result[item.key] = Array.from(item.entries.filter(entry => !!entry));
  }

  return result;
}

module.exports = function parseCourses(subject, xmlCourses) {
  let courses = new Set();
  for(let xmlCourse of xmlCourses) {
    let context = `in subject ${subject.title}`;
    assert.isString(xmlCourse.name, context);
    context = `in course ${xmlCourse.code}`;
    assert.isString(xmlCourse.code, context);
    assert.isString(xmlCourse.description, context);
    assert.isString(xmlCourse.point, context);
    assert.equal(xmlCourse.alternativeCourseCode.$["xsi:nil"], "true", context);

    let description = parseDescription(xmlCourse.description, context);
    let pointRanges = parsePointsRange(description, xmlCourse);
    let course = {
      title: xmlCourse.name.trim().replace(/\\n/g, ""),
      code: xmlCourse.code.trim().replace(/\\n/g, ""),
      description: description,
      educationScope: convertPointRangesIntoText(pointRanges, subject, xmlCourse),
      points: parseInt(xmlCourse.point),
      centralcontents: parseCentralContent(xmlCourse.centralContent, xmlCourse),
      knowledgerequirements: parseKnowledgeRequirements(xmlCourse.knowledgeRequirements, xmlCourse)
    }
    assert.isNotNaN(course.points, context);
    courses.add(course);
  }
  return courses;
}