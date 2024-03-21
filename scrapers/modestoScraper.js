const cheerio = require("cheerio");

// Global variable for categorizing articles.
subcategoriesObj = {};

// @ desc Scrapes The Modesto Bee for Article URLS.
// @ returns array of article URLS to scrape.
const getModestoURLS = async () => {
  console.log("Scraping The Modesto Bee");

  // Arrays to populate with URLS and thumbnails.
  const thumbnailArr = [];

  // Creating sets to populate with unique URLS.
  const crimeArticleURLS = new Set();
  const govArticleURLS = new Set();
  const edArticleURLS = new Set();
  const localNewsArticleURLS = new Set();
  const highSchoolArticleURLS = new Set();

  // URLS to scrape for article URLS
  const crimeURL = "https://www.modbee.com/news/local/crime";
  const govURL = "https://www.modbee.com/news/politics-government/election";
  const edURL = "https://www.modbee.com/news/local/education";
  const localNewsURL = "https://www.modbee.com/news/local";
  //const localSportsURL = ModestoBee has no localSports subcategory.
  const highSchoolURL = "https://www.modbee.com/sports/high-school";

  // Getting DOM strings for each page.
  const crimePromise = fetch(crimeURL).then((res) => res.text());
  const govPromise = fetch(govURL).then((res) => res.text());
  const edPromise = fetch(edURL).then((res) => res.text());
  const localNewsPromise = fetch(localNewsURL).then((res) => res.text());
  const highSchoolPromise = fetch(highSchoolURL).then((res) => res.text());
  console.log("Created HTTP GET req Promise Objects");

  // Waiting for all promises to resolve.
  const [crimeDOM, govDOM, edDOM, localNewsDOM, highSchoolDOM] =
    await Promise.all([
      crimePromise,
      govPromise,
      edPromise,
      localNewsPromise,
      highSchoolPromise,
    ]);
  console.log("Resolved all HTTP GET req Promise Objects");

  // Creating cheerio objects out of DOM strings.
  const $crime = cheerio.load(crimeDOM);
  const $gov = cheerio.load(govDOM);
  const $ed = cheerio.load(edDOM);
  const $localNews = cheerio.load(localNewsDOM);
  const $highSchool = cheerio.load(highSchoolDOM);

  // Populating Sets with URLS and thumbnailArr with thumbnail objects.
  getURLS($crime, thumbnailArr, crimeArticleURLS);
  getURLS($gov, thumbnailArr, govArticleURLS);
  getURLS($ed, thumbnailArr, edArticleURLS);
  getURLS($localNews, thumbnailArr, localNewsArticleURLS);
  getURLS($highSchool, thumbnailArr, highSchoolArticleURLS);

  // Populating GLOBAL object of subcategorized URLS.
  subcategoriesObj["CRIME"] = Array.from(crimeArticleURLS);
  subcategoriesObj["GOVERNMENT"] = Array.from(govArticleURLS);
  subcategoriesObj["EDUCATION"] = Array.from(edArticleURLS);
  subcategoriesObj["LOCAL NEWS"] = Array.from(localNewsArticleURLS);
  subcategoriesObj["HIGH SCHOOL SPORTS"] = Array.from(highSchoolArticleURLS);

  // Creating array of all unique URLS to return.
  const articleURLS = [
    ...crimeArticleURLS,
    ...govArticleURLS,
    ...edArticleURLS,
    ...localNewsArticleURLS,
    ...highSchoolArticleURLS,
  ];

  return [articleURLS, thumbnailArr];
};

// @ desc Scrapes The Modesto Bee
// @ returns updated Scraped data object with new scraped data.
const modestoBeeScraper = async () => {
  // Creating an array to push articles into and return.
  const articles = [];

  // Getting article URLS and turning them into DOM strings.
  const [urls, thumbnails] = await getModestoURLS();
  const urlPromises = urls.map((url) => {
    return fetch(url).then((res) => res.text());
  });
  const articleDOMS = await Promise.all(urlPromises);
  console.log("Got all Article URL DOMS, Scraping Data...");

  // Iterating over each article DOM, creating article object, and pushing it to articles array.
  for (let i = 0; i < articleDOMS.length; i++) {
    const articleObject = {};

    // Creating a main cheerio object out of current url.
    const $ = cheerio.load(articleDOMS[i]);

    // Getting author.
    const author =
      $("div.byline").find("a").text().trim() ||
      $("div.byline").text().trim().split("\n")[0].trim() ||
      null;
    // Getting date.
    const date =
      $("time.update-date").text() || $("time.publish-date").text() || null;
    const thumbnail = thumbnails[i];

    // Getting Image.
    const image = {};
    image["src"] = $("img.responsive-image").eq(0).attr("srcset") || null;
    image["alt"] = $("img.responsive-image").eq(0).attr("alt") || null;

    // Getting Paragraphs.
    const paragraphs = [];
    $("article")
      .find("p")
      .each((i, element) => {
        const paragraph = $(element);
        if (paragraph.text().trim() !== "") {
          paragraphs.push(paragraph.text().trim());
        }
      });

    // Getting more data with one-liners.
    const source = urls[i];
    const publisher = "The Modesto Bee";
    const heading = $("h1.h1").text().trim();
    const [category, subcategory] = getCategories(source);

    // Saving data to object.
    articleObject["source"] = source;
    articleObject["publisher"] = publisher;
    articleObject["heading"] = heading;
    articleObject["subheading"] = null;
    articleObject["category"] = category;
    articleObject["subcategory"] = subcategory;
    articleObject["author"] = author;
    articleObject["date"] = date;
    articleObject["image"] = image;
    articleObject["thumbnail"] = thumbnail;
    articleObject["paragraphs"] = paragraphs;

    // Edge case: Some modesto articles had no title and were still being worked on.
    if (articleObject.heading) {
      articles.push(articleObject);
    }
  }
  // Returning articles array.
  return articles;
};

// Populates URL Sets and thumbnails array according to cheerio obj passed in.
function getURLS($, thumbnailArr, toAdd) {
  // Gets URLS and thumbnails for articles.
  $("a.image-link-macro").each((i, element) => {
    const anchor = $(element);
    toAdd.add(anchor.attr("href"));
    thumbnailArr.push(anchor.find("img").attr("src"));
  });
}

// @ Desc gets categories from url.
// @ Returns category string.
function getCategories(source) {
  // Getting Categories.
  let category = "";
  let subcategory = "";
  if (subcategoriesObj["CRIME"].includes(source)) {
    category = "NEWS";
    subcategory = "CRIME";
  } else if (subcategoriesObj["GOVERNMENT"].includes(source)) {
    category = "NEWS";
    subcategory = "GOVERNMENT";
  } else if (subcategoriesObj["EDUCATION"].includes(source)) {
    category = "NEWS";
    subcategory = "EDUCATION";
  } else if (subcategoriesObj["LOCAL NEWS"].includes(source)) {
    category = "NEWS";
    subcategory = "LOCAL NEWS";
  } else {
    category = "SPORTS";
    subcategory = "HIGH SCHOOL SPORTS";
  }
  return [category, subcategory];
}

module.exports = { modestoBeeScraper };
