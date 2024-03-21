// Imports
const cheerio = require("cheerio");

// @ desc Scrapes Ripon Leader for article URLS.
// @ returns array of article URLS to scrape.
const getRiponURLS = async () => {
  console.log("Scraping The Ripon Press");

  // An array to populate with thumbnail objects.
  let thumbnailArr = [];

  // Creating sets to populate with unique URLS.
  const edArticleURLS = new Set();
  const localNewsArticleURLS = new Set();
  const highSchoolArticleURLS = new Set();

  // Main URLS to scrape.
  const edURL = "https://www.riponpress.com/news/education/";
  const localNewsURL = "https://www.riponpress.com/news/business/";
  const highSchoolURL = "https://www.riponpress.com/sports/prep/";

  // Getting DOM strings to create cheerio objects out of.
  const edPromise = fetch(edURL).then((res) => res.text());
  const localNewsPromise = fetch(localNewsURL).then((res) => res.text());
  const highSchoolPromise = fetch(highSchoolURL).then((res) => res.text());
  console.log("Created HTTP GET req Promise Objects");

  // Waiting for all promise objects to resolve.
  const [edDOM, localNewsDOM, highSchoolDOM] = await Promise.all([
    edPromise,
    localNewsPromise,
    highSchoolPromise,
  ]);
  console.log("Resolved all HTTP GET req Promise Objects.");

  // Creating cheerio objects.
  const $ed = cheerio.load(edDOM);
  const $localNews = cheerio.load(localNewsDOM);
  const $highSchool = cheerio.load(highSchoolDOM);

  // Populating Sets with URLS and thumbnailsArr with thumbnail objects.
  getURLS($ed, thumbnailArr, edArticleURLS);
  getURLS($localNews, thumbnailArr, localNewsArticleURLS);
  getURLS($highSchool, thumbnailArr, highSchoolArticleURLS);

  // Populating GLOBAL object of subcategorized URLS.
  subcategoriesObj["EDUCATION"] = Array.from(edArticleURLS);
  subcategoriesObj["LOCAL NEWS"] = Array.from(localNewsArticleURLS);
  subcategoriesObj["HIGH SCHOOL SPORTS"] = Array.from(highSchoolArticleURLS);

  // Creating an array of unique Article URLS to return.
  let articleURLS = [
    ...edArticleURLS,
    ...localNewsArticleURLS,
    ...highSchoolArticleURLS,
  ];
  return [articleURLS, thumbnailArr];
};
// @ desc Scrapes Ripon News
// @ returns updated Scraped data object with new scraped data.
const riponScraper = async () => {
  const articles = [];

  // Getting Ripon article urls and turning them into DOM strings.
  const [urls, thumbnails] = await getRiponURLS();
  const URLpromises = urls.map((url) => {
    return fetch(url).then((res) => res.text());
  });
  const articleDOMS = await Promise.all(URLpromises);
  console.log("Got all Article URL DOMS, Scraping Data...");

  // Iterating over each Ripon article DOM to scrape data.
  for (let i = 0; i < articleDOMS.length; i++) {
    // Article object to populate and push to articles array.
    const objectToPush = {};

    // Main Cheerio Object.
    const $ = cheerio.load(articleDOMS[i]);

    // Getting the Image.
    const currentImage = $('meta[property="og:image"]').attr("content");
    const imageAlt = $('meta[name="twitter:image:alt"]').attr("content");
    const image = { src: currentImage, alt: imageAlt };

    // Getting paragraphs.
    const paragraphs = [];
    $("div.asset-content")
      .find("p")
      .each((i, element) => {
        const p = $(element).text();
        if (p !== "") {
          paragraphs.push(p.trim());
        }
      });

    // Getting more Data with one-liners.
    const date = $("time.tnt-date").text().trim();
    const author = $("a.tnt-user-name:eq(1)").text().trim();
    const source = urls[i];
    const publisher = "Ripon Journal";
    const heading = $("h1.headline").text().trim();
    const subHeading = $("h2.subhead").text().trim() || null;
    const thumbnail = thumbnails[i];
    const [category, subcategory] = getCategories(source);

    // Saving data to an object to push to articles array.
    objectToPush["source"] = source;
    objectToPush["publisher"] = publisher;
    objectToPush["category"] = category;
    objectToPush["subcategory"] = subcategory;
    objectToPush["heading"] = heading;
    objectToPush["subHeading"] = subHeading;
    objectToPush["author"] = author;
    objectToPush["date"] = date;
    objectToPush["thumbnail"] = thumbnail.src
      ? thumbnail
      : image.src
      ? image
      : null;
    objectToPush["image"] = image.src ? image : null;
    objectToPush["paragraphs"] = paragraphs;

    if (objectToPush.paragraphs.length != 0) {
      articles.push(objectToPush);
    }
  }

  return articles;
};

// Populates URL Sets and thumbnails array according to cheerio obj passed in.
function getURLS($, thumbnailArr, toAdd) {
  // Gets URLS and thumbnails for articles.
  $("a.tnt-asset-link").each((i, element) => {
    const anchor = $(element);
    if (anchor.attr("href") !== "{{url}}") {
      toAdd.add("https://www.riponpress.com" + anchor.attr("href"));
    }
    let image = {
      src: anchor.find("img").attr("srcset"),
      alt: anchor.find("img").attr("alt"),
    };
    thumbnailArr.push(image);
  });
}

// @ Desc gets categories from url.
// @ Returns category string.
function getCategories(source) {
  // Getting Categories.
  let category = "";
  let subcategory = "";

  // Control flow for categorizing using global object.
  if (subcategoriesObj["EDUCATION"].includes(source)) {
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

module.exports = { riponScraper };
