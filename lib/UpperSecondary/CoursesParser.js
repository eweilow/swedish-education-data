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

module.exports = function parseCourses(subject, xmlCourses) {
  for(let xmlCourse of xmlCourses) {
    let context = `in subject ${subject.title}`;
    assert.isString(xmlCourse.name, context);
    context = `in course ${xmlCourse.code}`;
    assert.isString(xmlCourse.code, context);
    assert.isString(xmlCourse.description, context);
    assert.isString(xmlCourse.point, context);

    let course = {
      title: xmlCourse.name.trim(),
      code: xmlCourse.code.trim(),
      description: xmlCourse.description.trim(),
      points: parseInt(xmlCourse.point),
      centralcontents: parseCentralContent(xmlCourse.centralContent, xmlCourse),
      knowledgerequirements: parseKnowledgeRequirements(xmlCourse.knowledgeRequirements, xmlCourse)
    }
    assert.isNotNaN(course.points, context);
  }
}