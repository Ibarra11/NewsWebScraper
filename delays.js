const spinnerChars = ["|", "/", "-", "\\"];
let spinnerIndex = 0;
let spinnerInterval;

// Starts a loading animation in terminal.
const startSpinner = () => {
  if (!spinnerInterval) {
    spinnerInterval = setInterval(() => {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(spinnerChars[spinnerIndex]);
      spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    }, 250);
  }
};

// Stops loading animation in terminal.
const stopSpinner = () => {
  clearInterval(spinnerInterval);
  spinnerInterval = null;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
};

// Makes fetch request with a small delay of 1 to 3 seconds.
const smallFetchDelay = async (url) => {
  const delay = Math.floor(Math.random() * 3) + 1;
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  return fetch(url).then((response) => response.text());
};

// Makes fetch request with delay of 1 to 6 seconds.
const fetchDelay = async (url) => {
  const delay = Math.floor(Math.random() * 6) + 1;
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  return fetch(url).then((response) => response.text());
};

module.exports = { startSpinner, stopSpinner, smallFetchDelay, fetchDelay };
