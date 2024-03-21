const cheerio = require("cheerio");

// GLOBAL VARS FOR CATEGORIZING ARTICLES //
subcategoriesObj = {};

// @ Desc scrapes tracy press for article urls.
const getTracyURLS = async () => {
  console.log("Scraping The Tracy Press");

  // Creating sets to populate with unique URLS.
  const crimeArticleURLS = new Set();
  const govArticleURLS = new Set();
  const edArticleURLS = new Set();
  const localNewsArticleURLS = new Set();
  const localSportsArticleURLS = new Set();
  const highSchoolSportsArticleURLS = new Set();

  // URLS to scrape.
  const crimeNewsURL =
    "https://www.ttownmedia.com/tracy_press/news/law_and_order/";
  const govNewsURL =
    "https://www.ttownmedia.com/tracy_press/news/election_coverage/";
  const educationNewsURL =
    "https://www.ttownmedia.com/tracy_press/news/schools/";
  const localNewsURL = "https://www.ttownmedia.com/tracy_press/news/city/";
  const localSportsURL =
    "https://www.ttownmedia.com/tracy_press/sports/local_sports";
  const highSchoolSportsURL =
    "https://www.ttownmedia.com/tracy_press/sports/prep_sports";

  // Getting DOM strings to create cheerio objects out of.
  const crimePromise = fetch(crimeNewsURL).then((res) => res.text());
  const govPromise = fetch(govNewsURL).then((res) => res.text());
  const edPromise = fetch(educationNewsURL).then((res) => res.text());
  const localNewsPromise = fetch(localNewsURL).then((res) => res.text());
  const localSportsPromise = fetch(localSportsURL).then((res) => res.text());
  const highSchoolSportsPromise = fetch(highSchoolSportsURL).then((res) =>
    res.text()
  );
  console.log("Creating HTTP req Promise Objects");

  // Getting DOM string objects for each sub category.
  const [
    crimeDOM,
    govDOM,
    edDOM,
    localNewsDOM,
    highSchoolSportsDOM,
    localSportsDOM,
  ] = await Promise.all([
    crimePromise,
    govPromise,
    edPromise,
    localNewsPromise,
    highSchoolSportsPromise,
    localSportsPromise,
  ]);
  console.log("Resolved HTTP get Req promise Objects.");

  // Creating cheerio object out of DOM strings.
  const $crime = cheerio.load(crimeDOM);
  const $gov = cheerio.load(govDOM);
  const $ed = cheerio.load(edDOM);
  const $localNews = cheerio.load(localNewsDOM);
  const $highSchoolSports = cheerio.load(highSchoolSportsDOM);
  const $localSports = cheerio.load(localSportsDOM);

  // Getting URLS.
  getURLS($crime, crimeArticleURLS);
  getURLS($gov, govArticleURLS);
  getURLS($ed, edArticleURLS);
  getURLS($localNews, localNewsArticleURLS);
  getURLS($highSchoolSports, highSchoolSportsArticleURLS);
  getURLS($localSports, localSportsArticleURLS);

  // Populating GLOBAL object of subcategorized URLS.
  subcategoriesObj["CRIME"] = Array.from(crimeArticleURLS);
  subcategoriesObj["GOVERNMENT"] = Array.from(govArticleURLS);
  subcategoriesObj["EDUCATION"] = Array.from(edArticleURLS);
  subcategoriesObj["LOCAL NEWS"] = Array.from(localNewsArticleURLS);
  subcategoriesObj["HIGH SCHOOL SPORTS"] = Array.from(
    highSchoolSportsArticleURLS
  );
  subcategoriesObj["LOCAL SPORTS"] = Array.from(localSportsArticleURLS);

  // Returning array of unique articles URLS.
  let articleURLS = [
    ...crimeArticleURLS,
    ...govArticleURLS,
    ...edArticleURLS,
    ...localNewsArticleURLS,
    ...highSchoolSportsArticleURLS,
    ...localSportsArticleURLS,
  ];
  return articleURLS;
};

// @ desc Scrapes Oakdale Leader
// @ returns updated Scraped data object with new scraped data.
const tracyPressScraper = async () => {
  const articles = [];

  // Getting an array of article DOM strings for cheerio.
  const urls = await getTracyURLS();
  const URLpromises = urls.map((url) => {
    return fetch(url)
      .then((res) => res.text())
      .catch((e) => `${e.message} Could not get ${url}`);
  });
  const articleDOMS = await Promise.all(URLpromises);
  console.log("Got Article URL DOMS, Scraping Data...");

  // Iterating over urls, turning them to article objects, and pushing them to articles array.
  for (let i = 0; i < articleDOMS.length; i++) {
    // Creating article object and main cheerio object.
    const objectToPush = {};
    const $ = cheerio.load(articleDOMS[i]);

    // Getting author.
    const author =
      $("div.asset-masthead")
        .find("ul.list-inline")
        .find("span.tnt-byline")
        .text()
        .trim() || "The Tracy Press";

    // Getting date.
    const date = $("div.meta")
      .find("span")
      .find("ul")
      .find("li.hidden-print")
      .find("time")
      .text()
      .trim();

    // Getting Image.
    const src = $("div.image").find("div").children().eq(2).attr("content");
    const alt = $("div.image").find("div").children().find("img").attr("alt");
    const image = { src, alt };

    // Getting paragraphs.
    const paragraphs = [];
    $("div.asset-content")
      .find("p")
      .each((i, element) => {
        const paragraph = $(element).text().trim();
        paragraphs.push(paragraph);
      });

    // Getting the source, category, and subcategory.
    const source = urls[i];
    const [category, subcategory] = getCategories(source);

    // Getting more data, single-liners.
    const publisher = "The Tracy Press";
    const heading = $("h1.headline").find("span").text().trim();

    // Saving data to an object I will push to the array of objects.
    objectToPush["source"] = source;
    objectToPush["publisher"] = publisher;
    objectToPush["heading"] = heading;
    objectToPush["subHeading"] = null;
    objectToPush["category"] = category;
    objectToPush["subcategory"] = subcategory;
    objectToPush["author"] = author;
    objectToPush["date"] = date;
    objectToPush["img"] = image.src ? image : null;
    objectToPush["thumbnail"] = image.src ? image : null;
    objectToPush["paragraphs"] = paragraphs;

    // Pushing object to articles array.
    if (objectToPush.paragraphs.length != 0) {
      articles.push(objectToPush);
    }
  }
  return articles;
};

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
  } else if (subcategoriesObj["LOCAL SPORTS"].includes(source)) {
    category = "SPORTS";
    subcategory = "LOCAL SPORTS";
  } else {
    category = "SPORTS";
    subcategory = "HIGH SCHOOL SPORTS";
  }

  return [category, subcategory];
}

// Populates URL SETS based on cheerio object passed in.
function getURLS($, addTo) {
  $("div.card-container")
    .find("a.tnt-asset-link")
    .each((i, element) => {
      const $anchor = $(element);
      const url = $anchor.attr("href").includes("https://ttownmedia.com")
        ? $anchor.attr("href")
        : "https://www.ttownmedia.com" + $anchor.attr("href");
      addTo.add(url);
    });
}

module.exports = { tracyPressScraper };
