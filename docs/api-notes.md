# Open-Meteo API notes

These endpoints do not require an API key.

## Geocoding

Request:

`https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1`

The live response returned one result. Fields used to identify and locate the
city:

- `results[0].name` -> `city`
- `results[0].country` -> `country`
- `results[0].latitude` -> `latitude`
- `results[0].longitude` -> `longitude`

Trimmed response from the live request:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

Request for the coordinates returned by geocoding:

`https://api.open-meteo.com/v1/forecast?latitude=18.51957&longitude=73.85535&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

The requested `current` fields map to the log columns as follows:

- `current.temperature_2m` -> `temperature_c`
- `current.relative_humidity_2m` -> `humidity`
- `current.wind_speed_10m` -> `wind_kmh`
- `current.weather_code` -> `weather_code`
- A human-readable condition for `condition` must be derived from the weather
  code; the API request does not include a text condition field.

The fetch MCP tool refused this request because the API host's `robots.txt`
disallows automated fetching. Therefore, no live weather response or trimmed
weather JSON example is included here, and no observation was inserted into
`weather_logs`. Fetch this URL manually and add a real response example before
using the data as a logged observation.
