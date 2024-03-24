const cheerio = require("cheerio");
const { fetchWithProxy } = require("../proxyFetch");
const moment = require("moment");

// GLOBAL VARS FOR CATEGORIZING ARTICLES //
subcategoriesObj = {};

// @ Desc scrapes tracy press for article urls.
const getTracyURLS = async (proxy = false) => {
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

  // Variables to reasign depending on if proxy is used.
  let crimePromise;
  let govPromise;
  let edPromise;
  let localNewsPromise;
  let localSportsPromise;
  let highSchoolSportsPromise;

  // Getting Category DOMS.
  if (!proxy) {
    console.log("Fetching Category DOMS");
    crimePromise = fetch(crimeNewsURL).then((res) => res.text());
    govPromise = fetch(govNewsURL).then((res) => res.text());
    edPromise = fetch(educationNewsURL).then((res) => res.text());
    localNewsPromise = fetch(localNewsURL).then((res) => res.text());
    localSportsPromise = fetch(localSportsURL).then((res) => res.text());
    highSchoolSportsPromise = fetch(highSchoolSportsURL).then((res) =>
      res.text()
    );
  } else {
    console.log("Fetching Category DOMS with Proxy");
    crimePromise = fetchWithProxy(crimeNewsURL);
    govPromise = fetchWithProxy(govNewsURL);
    edPromise = fetchWithProxy(educationNewsURL);
    localNewsPromise = fetchWithProxy(localNewsURL);
    localSportsPromise = fetchWithProxy(localSportsURL);
    highSchoolSportsPromise = fetchWithProxy(highSchoolSportsURL);
  }
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
  console.log("Got all Category DOMS");

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
const tracyPressScraper = async (proxy = false) => {
  const articles = [];

  // Getting article URLS.
  let urls;
  if (!proxy) {
    urls = await getTracyURLS();
  } else {
    urls = await getTracyURLS(true);
  }
  console.log("Got all article URLS");

  // Getting Article DOMS
  let URLpromises;
  if (!proxy) {
    URLpromises = urls.map((url) => {
      return fetch(url)
        .then((res) => res.text())
        .catch((e) => `${e.message} Could not get ${url}`);
    });
  } else {
    URLpromises = urls.map((url) => {
      return fetchWithProxy(url);
    });
  }

  const articleDOMS = await Promise.all(URLpromises);
  console.log("Got all article DOMS, Scraping Data...");

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
    let datetime;
    try {
      datetime = $("div.meta")
        .find("span")
        .find("ul")
        .find("li.visible-print")
        .find("time")
        .attr("datetime");
      datetime = moment(datetime).toDate();
    } catch {
      datetime = null;
    }

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
    objectToPush["datetime"] = datetime;
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
