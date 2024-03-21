const cheerio = require("cheerio");

// GLOBAL VARIABLE///
const subcategoriesObj = {};

// @ desc Scrapes The Turlock Journal for article URLS.
// @ returns array of article URLS to scrape.
const getTurlockURLS = async () => {
  console.log("Scraping The Turlock Journal");

  // Arrays to return.
  const thumbnailArr = [];

  // Creating sets to populate with unique URLS
  const crimeArticleURLS = new Set();
  const govArticleURLS = new Set();
  const edArticleURLS = new Set();
  const localNewsArticleURLS = new Set();
  const localSportsArticleURLS = new Set();
  const highSchoolSportsArticleURLS = new Set();

  // URLS to scrape.
  const crimeURLS = "https://www.turlockjournal.com/news/crime";
  const govURLS = "https://www.turlockjournal.com/news/government";
  const edURLS = "https://www.turlockjournal.com/news/education";
  const localNewsURLS = "https://www.turlockjournal.com/news/local";
  const localSportsURLS = "https://www.turlockjournal.com/sports/community";
  const highSchoolURLS =
    "https://www.turlockjournal.com/news/high-school-sports";

  // Getting DOM strings to create cheerio objects out of.
  const crimePromise = fetch(crimeURLS).then((res) => res.text());
  const govPromise = fetch(govURLS).then((res) => res.text());
  const edPromise = fetch(edURLS).then((res) => res.text());
  const localNewsPromise = fetch(localNewsURLS).then((res) => res.text());
  const localSportsPromise = fetch(localSportsURLS).then((res) => res.text());
  const highSchoolPromise = fetch(highSchoolURLS).then((res) => res.text());
  console.log("Created HTTP GET req promise Objects.");

  const [crimeDOM, govDOM, edDOM, localNewsDOM, localSportsDOM, highSchoolDOM] =
    await Promise.all([
      crimePromise,
      govPromise,
      edPromise,
      localNewsPromise,
      localSportsPromise,
      highSchoolPromise,
    ]);
  console.log("Resolved HTTP GET req promise objects.");

  // Creating cheerio objects out of DOM strings.
  const $crime = cheerio.load(crimeDOM);
  const $gov = cheerio.load(govDOM);
  const $ed = cheerio.load(edDOM);
  const $localNews = cheerio.load(localNewsDOM);
  const $localSports = cheerio.load(localSportsDOM);
  const $highSchoolSports = cheerio.load(highSchoolDOM);

  // Populating Sets with URLS, and populating thumbnailArr.
  getURLS($crime, thumbnailArr, crimeArticleURLS);
  getURLS($gov, thumbnailArr, govArticleURLS);
  getURLS($ed, thumbnailArr, edArticleURLS);
  getURLS($localNews, thumbnailArr, localNewsArticleURLS);
  getURLS($localSports, thumbnailArr, localSportsArticleURLS);
  getURLS($highSchoolSports, thumbnailArr, highSchoolSportsArticleURLS);

  // Populating GLOBAL object of subcategorized URLS.
  subcategoriesObj["CRIME"] = Array.from(crimeArticleURLS);
  subcategoriesObj["GOVERNMENT"] = Array.from(govArticleURLS);
  subcategoriesObj["EDUCATION"] = Array.from(edArticleURLS);
  subcategoriesObj["LOCAL NEWS"] = Array.from(localNewsArticleURLS);
  subcategoriesObj["HIGH SCHOOL SPORTS"] = Array.from(
    highSchoolSportsArticleURLS
  );
  subcategoriesObj["LOCAL SPORTS"] = Array.from(localSportsArticleURLS);

  // Array of unique article URLS to return.
  let articleURLS = [
    ...crimeArticleURLS,
    ...govArticleURLS,
    ...edArticleURLS,
    ...localNewsArticleURLS,
    ...localSportsArticleURLS,
    ...highSchoolSportsArticleURLS,
  ];
  return [articleURLS, thumbnailArr];
};

// @ desc Scrapes The Turlock Journal
// @ returns updated Scraped data object with new scraped data.
const turlockJournalScraper = async () => {
  const articles = [];

  // Getting an array of article DOM strings for cheerio.
  const [urls, thumbnails] = await getTurlockURLS();
  const URLpromises = urls.map((url) => {
    return fetch(url).then((res) => res.text());
  });
  const articleDOMS = await Promise.all(URLpromises);
  console.log("Got Article URL DOMS, Scraping Data...");

  // Iterating over each DOM in article DOM, and creating article object to push to articles array.
  for (let i = 0; i < articleDOMS.length; i++) {
    const objectToPush = {};

    // Creating main cheerio object.
    const $ = cheerio.load(articleDOMS[i]);

    // Getting JSON data for finding author and date.
    const jsonData = JSON.parse(
      $("div.anvil-padding-bottom")
        .find("span")
        .attr("data-page-tracker-analytics-payload")
    );

    // Getting image cheerio object for getting image data.
    const $image = $("div.anvil-images__image-container")
      .find("picture.anvil-images__image--main-article")
      .next();

    // Getting paragraphs.
    const paragraphs = [];
    $("div.rich-text")
      .find("div.rich-text")
      .children()
      .each((i, element) => {
        const p = $(element);
        if (p.text().trim() !== "") {
          paragraphs.push(p.text().trim());
        }
      });

    // Getting more data that fit in single line.
    const source = urls[i];
    const publisher = "Turlock Journal";
    const heading = $("div.anvil-article__title").text();
    const subHeading = $("div.anvil-article__subtitle").text().trim() || null;
    const author = jsonData.page_meta.author || paragraphs[0];
    const date = jsonData.page_meta.page_created_at_pretty;
    const image = { src: $image.attr("src"), alt: $image.attr("alt") };
    const [category, subcategory] = getCategories(source);

    // Saving data to an object I will push to the array of objects.
    objectToPush["source"] = source;
    objectToPush["publisher"] = publisher;
    objectToPush["heading"] = heading.trim();
    objectToPush["subHeading"] = subHeading;
    objectToPush["category"] = category;
    objectToPush["subcategory"] = subcategory;
    objectToPush["author"] = author;
    objectToPush["date"] = date;
    objectToPush["img"] = image;
    objectToPush["thumbnail"] = thumbnails[i];
    objectToPush["paragraphs"] = paragraphs;

    articles.push(objectToPush);
  }
  return articles;
};

// Populates URL Sets and thumbnails array according to cheerio obj passed in.
function getURLS($, thumbnailArr, addTo) {
  // Gets URLS and thumbnails for articles.
  $("a.anvil-images__image-container").each((i, element) => {
    const anchor = $(element);
    addTo.add(anchor.attr("href"));
    const $thumbnail = anchor.find("img.anvil-images__image--main-article");
    const { src, alt } = $thumbnail.attr();
    const thumbnail = { src, alt };
    thumbnailArr.push(thumbnail);
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
  } else if (subcategoriesObj["LOCAL SPORTS"].includes(source)) {
    category = "SPORTS";
    subcategory = "LOCAL SPORTS";
  } else {
    category = "SPORTS";
    subcategory = "HIGH SCHOOL SPORTS";
  }

  return [category, subcategory];
}

module.exports = { turlockJournalScraper };
