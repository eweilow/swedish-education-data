const xml2js = require("xml2js");
const cheerio = require("cheerio");
const assert = require("chai").assert;

const CoursesParser = require("./CoursesParser.js");

function parseXML(str) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(str, { explicitArray: false }, (err, result) => {
      if(err) return reject(err);
      resolve(result);
    })
  })
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

function parsePurpose(purpose, code, context) {
  purpose = purpose.replace(/<ol>/g, "<l>").replace(/<\/ol>/g, "</l>")
  let $ = cheerio.load(purpose);
  
  function parseRegular(purpose, orderedList) {
    assert.isAbove(purpose.text().length, 0, context);
    assert.isAbove(purpose.length, 0, context);
    assert.equal(orderedList.length, 1, context);

    let purposeText = [];
    purpose.each((index, element) => {
      purposeText.push($(element).text());
    });
    purposeText = purposeText.filter(s => !!s);
    for(let item of purposeText) {
      assert.isString(item, context);
    }

    let purposeItems = [];
    orderedList.children("li").each((index, element) => {
      purposeItems.push(index + ". " + $(element).text());
    });
    purposeItems.sort((a, b) => a.slice(0,1).localeCompare(b.slice(0,1)));
    purposeItems = purposeItems.filter(s => !!s).map(s => {
      assert.isString(s, context);
      return s.replace(/^\d\.\s*/, "");
    });

    return {
      text: purposeText.join("\n"),
      items: purposeItems
    }
  }
  
  const count_h4 = $("h4").length;
  const count_h3 = $("h3").length;
  const count_l = $("l").length;
  if(count_h4 === 1 && count_h3 === 1 && count_l === 2) {
    let list = $("h3").prevAll("l").first();
    //let courses = $("h3").after("l");
    let start = $("h4").prevAll("p");
    return parseRegular(start, list);
  } else {
    console.log("Automatically healing malformed subject purpose in " + code);
    if(count_h4 === 0 && count_h3 === 1 && count_l === 2) {
      let list = $("h3").prevAll("l").first();
      //let courses = $("h3").after("l");
      let start = list.prevAll("p");
      return parseRegular(start, list);
    } else if (count_h4 === 1 && count_h3 === 1 && count_l === 1) {
      /* Weird edge case for subject with code DAG */
      //let courses = $("h3").after("l");
      let list = $("h3").prevUntil("h4");
      let start = $("h4").prevAll("p");
      assert.isAbove(start.text().length, 0, context);
      assert.isAbove(start.length, 0, context);
      assert.isAtLeast(list.length, 1, context);
      
      let purposeText = [];
      start.each((index, element) => {
        purposeText.push($(element).text());
      });
      purposeText = purposeText.filter(s => !!s);

      let purposeItems = [];
      list.each((index, element) => {
        purposeItems.push($(element).text());
      });
      purposeItems.sort((a, b) => a.slice(0,1).localeCompare(b.slice(0,1)));
      purposeItems = purposeItems.filter(s => !!s).map(s => {
        assert.isString(s, context);
        return s.replace(/^\d\.\s*/, "");
      });

      return {
        text: purposeText.join("\n"),
        items: purposeItems
      }
    } else {
      console.info(count_h4, count_h3, count_l, purpose)
      assert.fail("unknown edge case", "should work", context);
    }
  }
}

module.exports = function parseSubjects(files, subjects, courses) {
  const validTypesOfSchooling = [
    "UPPER_SECONDARY_EDUCATION", 
    "SWEDISH_FOR_IMMIGRANTS", 
    "SAMI_SCHOOL",
    "EDU_FOR_ADULTS_WITH_LEARNING_DISABILITIES", 
    "EDU_FOR_PUPILS_WITH_LEARNING_DISABILITIES",
    "ADULT_SECONDARY_EDUCATION", 
    "SPECIAL_SCHOOL_FOR_PUPILS_WITH_IMPAIRED_HEARING"
  ];
  let xmlParsePromises = [];
  for(let {contents, tag} of files) {
    xmlParsePromises.push(parseXML(contents.toString()).then(xmlParse => { return { xml: xmlParse, tag: tag } }));
  }
  return Promise.all(xmlParsePromises)
    .then((xmlFiles) => {
      let newSubjects = new Map();
      let newCourses = new Map();

      let manualSubjects = new Set();
      let nonManualSubjects = new Set();
      for(let {xml, tag} of xmlFiles) {
        let context = `in xml`;

        const xmlSubject = xml.subject;
        xmlSubject.name = xmlSubject.name.replace(/–/g, "-");
        assert.isNotArray(xmlSubject, context);
        assert.isString(xmlSubject.code, context);
        context = `in subject ${xmlSubject.code}, ${xmlSubject.name}`;
        assert.isString(xmlSubject.applianceDate, context);
        assert.isString(xmlSubject.typeOfSchooling, context);
        assert.equal(xmlSubject.typeOfSchooling, "UPPER_SECONDARY_EDUCATION", context);
        assert.isString(xmlSubject.category, context);
        assert.equal(xmlSubject.gradeScale["$"]["xsi:nil"], "true", context); //make sure we don't miss anything
        assert.isString(xmlSubject.skolfsId, context); //make sure we don't miss anything

        if(!Array.isArray(xmlSubject.courses)) {
          xmlSubject.courses = [ xmlSubject.courses ];
        }
        assert.isArray(xmlSubject.courses, context);

        const subject = subjects.get(xmlSubject.code.trim());
        if(xmlSubject.previousCode) {
          assert.isString(xmlSubject.previousCode, context);
        }
        subject.previousCode = xmlSubject.previousCode || null;
        subject.appliesFrom = new Date(xmlSubject.applianceDate);
        subject.typeOfSchooling = xmlSubject.typeOfSchooling;
        subject.category = xmlSubject.category;
        subject.description = parseDescription(xmlSubject.description, context);
        subject.purpose = parsePurpose(xmlSubject.purpose, xmlSubject.code, context);
        subject.courses = Array.from(CoursesParser(subject, xmlSubject.courses));

        if(tag === "manual") {
          manualSubjects.add(subject.code);
          console.log(`using manually parsed course ${subject.title}/${subject.code}`);
        } else {
          nonManualSubjects.add(subject.code);
        }

        assert.isNotNaN(subject.appliesFrom.getTime(), context);
        assert.equal(subject.code, xmlSubject.code, context);
        assert.equal(subject.previousCode, xmlSubject.previousCode, context);
        assert.equal(subject.title, xmlSubject.name, context);
        assert.isTrue(validTypesOfSchooling.indexOf(subject.typeOfSchooling) >= 0, context);
        assert.isString(subject.purpose.text, context);
        assert.isArray(subject.purpose.items, context);
        assert.isAtLeast(subject.purpose.items.length, 1, context);

        newSubjects.set(subject.code, subject);
        for(let course of subject.courses) {
          newCourses.set(course.code, course);
        }
      }

      for(let manualCode of manualSubjects) {
        assert.isFalse(nonManualSubjects.has(manualCode), `Manually created subject ${manualCode} now exists`);
      }

      for(let [code, subject] of subjects) {
        if(!newSubjects.has(code)) console.log(`We are missing a subject: ${subject.title} ${code}`);
      }
      for(let [code, course] of courses) {
        if(!newCourses.has(code)) console.log(`We are missing a course: ${course.title} ${code}`);
      }
      return {
        courses: newCourses,
        subjects: newSubjects
      };
    });
};