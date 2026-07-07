/**
 * collect-joyalukkas-rate.js
 *
 * Fetches the current gold rate from Joyalukkas' public GraphQL endpoint
 * and appends it to joyalukkas-history.json. Meant to be run on a schedule
 * (e.g. twice a day via cron) so you build up your own historical record
 * over time, since their API only ever returns "right now" - not history.
 *
 * Usage:
 *   node collect-joyalukkas-rate.js
 *
 * Optional env vars:
 *   OUTPUT_FILE   (default: joyalukkas-history.json, saved next to this script)
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(__dirname, "joyalukkas-history.json");

const GRAPHQL_URL = "https://www.joyalukkas.com/graphql";
const QUERY = `
  query getgoldrates {
    getgoldrates {
      Id
      Message
      Status
      metal_rate_time
      Data {
        Id
        BRANCH_CODE
        BRANCH_NAME
        GOLD_14KT_RATE
        GOLD_18KT_RATE
        GOLD_22KT_RATE
        GOLD_24KT_RATE
        SILVER_RATE
        SILVER_RATE100
        SILVER_RATE999
        PLATINUM_RATE
        __typename
      }
      __typename
    }
  }
`;

async function fetchCurrentRate() {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: QUERY,
      operationName: "getgoldrates",
      variables: {},
    }),
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const result = json?.data?.getgoldrates;
  if (!result || result.Status !== 200) {
    throw new Error(`Unexpected response: ${JSON.stringify(json)}`);
  }

  return result;
}

function loadExistingHistory() {
  if (!fs.existsSync(OUTPUT_FILE)) return [];
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not parse existing ${OUTPUT_FILE}, starting fresh. (${err.message})`);
    return [];
  }
}

async function main() {
  console.log(`Fetching current Joyalukkas gold rate...`);
  const result = await fetchCurrentRate();
  const rateData = result.Data?.[0] || {};

  const entry = {
    fetched_at: new Date().toISOString(),   // when WE captured it (always exact)
    rate_time: result.metal_rate_time,      // timestamp Joyalukkas itself reports
    gold_14kt: parseFloat(rateData.GOLD_14KT_RATE),
    gold_18kt: parseFloat(rateData.GOLD_18KT_RATE),
    gold_22kt: parseFloat(rateData.GOLD_22KT_RATE),
    gold_24kt: parseFloat(rateData.GOLD_24KT_RATE),
    silver_rate: parseFloat(rateData.SILVER_RATE),
    platinum_rate: parseFloat(rateData.PLATINUM_RATE),
  };

  const history = loadExistingHistory();

  // Avoid duplicate entries if the rate hasn't changed since the last run
  // and Joyalukkas' own rate_time timestamp hasn't moved either.
  const last = history[history.length - 1];
  if (last && last.rate_time === entry.rate_time) {
    console.log(`No new rate since last check (rate_time unchanged: ${entry.rate_time}). Skipping.`);
    return;
  }

  history.push(entry);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2));

  console.log(`Saved new entry:`, entry);
  console.log(`Total entries in history: ${history.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
