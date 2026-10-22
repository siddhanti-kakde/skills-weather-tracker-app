import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const databasePath = fileURLToPath(new URL("../weather.db", import.meta.url));

// Open the existing database and fail clearly if it is missing.
export function openDatabase() {
  if (!existsSync(databasePath)) {
    throw new Error(`Database not found at ${databasePath}.`);
  }

  return new Database(databasePath, { fileMustExist: true });
}

// Insert one weather observation using bound parameters.
export function insertWeatherLog(database, weather) {
  return database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c, humidity,
      wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperature_c, @humidity,
      @wind_kmh, @condition, @weather_code
    )
  `).run(weather);
}

// Return recent observations with the newest entries first.
export function listWeatherLogs(database, limit) {
  return database.prepare(`
    SELECT id, city, country, temperature_c, humidity, wind_kmh, condition,
           weather_code, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Summarize temperature readings for a city without interpolating SQL values.
export function getCityStats(database, city) {
  return database.prepare(`
    SELECT COUNT(*) AS count,
           MIN(temperature_c) AS min_temperature,
           MAX(temperature_c) AS max_temperature,
           AVG(temperature_c) AS average_temperature
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
