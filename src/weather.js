const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
const forecastUrl = "https://api.open-meteo.com/v1/forecast";

const conditions = new Map([
  [0, "clear"],
  [1, "mainly clear"],
  [2, "partly cloudy"],
  [3, "cloudy"],
  [45, "fog"],
  [48, "fog"],
  [51, "drizzle"],
  [53, "drizzle"],
  [55, "drizzle"],
  [56, "freezing drizzle"],
  [57, "freezing drizzle"],
  [61, "rain"],
  [63, "rain"],
  [65, "heavy rain"],
  [66, "freezing rain"],
  [67, "freezing rain"],
  [71, "snow"],
  [73, "snow"],
  [75, "heavy snow"],
  [77, "snow grains"],
  [80, "rain showers"],
  [81, "rain showers"],
  [82, "heavy rain showers"],
  [85, "snow showers"],
  [86, "heavy snow showers"],
  [95, "thunderstorm"],
  [96, "thunderstorm with hail"],
  [99, "thunderstorm with hail"]
]);

// Translate an Open-Meteo WMO weather code into a readable condition.
export function describeWeatherCode(code) {
  return conditions.get(code) ?? "unknown";
}

// Fetch JSON and report network, HTTP, and malformed-response errors clearly.
async function fetchJson(url, endpointName) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Could not reach the Open-Meteo ${endpointName} service. Check your network connection.`);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo ${endpointName} request failed (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Open-Meteo ${endpointName} returned invalid JSON.`);
  }
}

// Resolve a city and fetch its current weather from Open-Meteo.
export async function fetchCurrentWeather(city) {
  const geocoding = new URL(geocodingUrl);
  geocoding.search = new URLSearchParams({ name: city, count: "1" }).toString();
  const geocodingData = await fetchJson(geocoding, "geocoding");
  const place = geocodingData.results?.[0];

  if (!place) {
    throw new Error(`No matching city found for "${city}". Check the spelling and try again.`);
  }

  const forecast = new URL(forecastUrl);
  forecast.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    wind_speed_unit: "kmh"
  }).toString();
  const forecastData = await fetchJson(forecast, "current weather");
  const current = forecastData.current;

  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.wind_speed_10m) ||
    !Number.isInteger(current.weather_code)
  ) {
    throw new Error("Open-Meteo current weather response is missing required weather fields.");
  }

  return {
    city: place.name,
    country: place.country ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: describeWeatherCode(current.weather_code),
    weather_code: current.weather_code
  };
}
