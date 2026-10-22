import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  insertWeatherLog,
  listCitySummaries,
  listWeatherLogs,
  openDatabase
} from "./db.js";
import { fetchCurrentWeather } from "./weather.js";

const port = Number(process.env.PORT ?? 3000);
const dashboardPath = fileURLToPath(new URL("../public/index.html", import.meta.url));

// Send a JSON response with consistent headers.
function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

// Serve the dashboard HTML as the only static page.
async function serveDashboard(response) {
  try {
    const html = await readFile(dashboardPath);
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff"
    });
    response.end(html);
  } catch (error) {
    console.error("Could not read dashboard HTML:", error.message);
    sendJson(response, 500, { error: "The dashboard could not be loaded." });
  }
}

// Dispatch dashboard and API requests.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html")) {
    await serveDashboard(response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/logs") {
    const database = openDatabase();
    try {
      sendJson(response, 200, listWeatherLogs(database, 50));
    } finally {
      database.close();
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/summary") {
    const database = openDatabase();
    try {
      sendJson(response, 200, listCitySummaries(database));
    } finally {
      database.close();
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
    const city = requestUrl.searchParams.get("city")?.trim();
    if (!city) {
      sendJson(response, 400, { error: "Provide a city query parameter." });
      return;
    }
    if (city.length > 200) {
      sendJson(response, 400, { error: "City name must be 200 characters or fewer." });
      return;
    }

    try {
      const weather = await fetchCurrentWeather(city);
      const database = openDatabase();
      try {
        const result = insertWeatherLog(database, weather);
        sendJson(response, 201, { id: Number(result.lastInsertRowid), ...weather });
      } finally {
        database.close();
      }
    } catch (error) {
      const statusCode = error.message.startsWith("No matching city") ? 404 : 502;
      sendJson(response, statusCode, { error: error.message });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

// Create the HTTP server with explicit handling for unexpected request errors.
export function createServer() {
  return createHttpServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      console.error("Request failed:", error.message);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "The request could not be completed." });
      } else {
        response.destroy(error);
      }
    });
  });
}

// Start the dashboard server when this file is run directly.
function startServer() {
  const server = createServer();
  server.on("error", (error) => {
    console.error(`Could not start the dashboard server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Weather dashboard running at http://localhost:${port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}