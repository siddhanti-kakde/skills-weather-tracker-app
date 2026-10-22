import {
  getCityStats,
  insertWeatherLog,
  listWeatherLogs,
  openDatabase
} from "./db.js";
import { fetchCurrentWeather } from "./weather.js";

// Parse and validate the optional list limit.
function parseLimit(args) {
  let limit = 10;
  let limitProvided = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--limit") {
      throw new Error(`Unexpected list argument: ${args[index]}`);
    }
    if (limitProvided || !args[index + 1]) {
      throw new Error("Use --limit once with a positive integer, for example: list --limit 5.");
    }
    limitProvided = true;
    limit = Number(args[index + 1]);
    index += 1;
  }
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("The list limit must be a positive integer.");
  }
  return limit;
}

// Print values as a padded text table.
function printTable(headers, rows) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column] ?? "-").length))
  );
  const formatRow = (row) =>
    `| ${row.map((value, index) => String(value ?? "-").padEnd(widths[index])).join(" | ")} |`;
  console.log(formatRow(headers));
  console.log(`|-${widths.map((width) => "-".repeat(width)).join("-|-")}-|`);
  for (const row of rows) console.log(formatRow(row));
}

// Add and confirm a live weather observation for the requested city.
async function addCity(city) {
  if (!city?.trim()) throw new Error('Usage: node src/cli.js add "<city>"');
  const weather = await fetchCurrentWeather(city.trim());
  const database = openDatabase();
  try {
    const result = insertWeatherLog(database, weather);
    console.log(`Logged ${weather.city}, ${weather.country}: ${weather.temperature_c}°C, ${weather.condition} (id ${result.lastInsertRowid}).`);
  } finally {
    database.close();
  }
}

// Display recent observations in a readable table.
function listCities(args) {
  const limit = parseLimit(args);
  const database = openDatabase();
  try {
    const logs = listWeatherLogs(database, limit);
    if (logs.length === 0) {
      console.log("No weather logs yet. Add one with: node src/cli.js add \"<city>\"");
      return;
    }
    printTable(
      ["ID", "City", "Country", "Temp °C", "Humidity %", "Wind km/h", "Condition", "Code", "Created at"],
      logs.map((log) => [
        log.id,
        log.city,
        log.country,
        log.temperature_c,
        log.humidity,
        log.wind_kmh,
        log.condition,
        log.weather_code,
        log.created_at
      ])
    );
  } finally {
    database.close();
  }
}

// Display temperature statistics for the requested city.
function showStats(city) {
  if (!city?.trim()) throw new Error('Usage: node src/cli.js stats "<city>"');
  const database = openDatabase();
  try {
    const stats = getCityStats(database, city.trim());
    if (stats.count === 0) {
      console.log(`No weather logs found for "${city.trim()}".`);
      return;
    }
    console.log(`Weather stats for ${city.trim()} (${stats.count} logs)`);
    console.log(`Min temperature: ${stats.min_temperature ?? "n/a"}°C`);
    console.log(`Max temperature: ${stats.max_temperature ?? "n/a"}°C`);
    console.log(`Average temperature: ${stats.average_temperature?.toFixed(1) ?? "n/a"}°C`);
  } finally {
    database.close();
  }
}

// Route CLI arguments to the requested command and report errors without stack traces.
async function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case "add":
        await addCity(args.join(" "));
        break;
      case "list":
        listCities(args);
        break;
      case "stats":
        showStats(args.join(" "));
        break;
      default:
        throw new Error('Usage: node src/cli.js <add "<city>" | list [--limit N] | stats "<city>">');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
