/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

const API_KEY = "cd5743655e1a5d90679cffd3f85fa4fd";  // api
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export class WeatherService {
  constructor(rpcService) {
    this.rpc = rpcService;
  }

  async detectUserLocation() {
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 600000, // 10 minutes
          });
        });

        const lat = position.coords.latitude.toString();
        const lon = position.coords.longitude.toString();

        // Get location name from OpenWeatherMap
        const locationName = await this.getLocationName(lat, lon);

        return { lat, lon, locationName };
      } else {
        throw new Error("Geolocation not supported");
      }
    } catch (error) {
      console.warn("Location detection failed:", error);
      return {
        lat: "28.6139", // New Delhi fallback
        lon: "77.2090",
        locationName: "Location access denied - using default",
      };
    }
  }

  async getLocationName(lat, lon) {
    try {
      const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.name || "Unknown Location";
    } catch (error) {
      console.warn("Location name detection failed:", error);
      return "Unknown Location";
    }
  }

  async fetchWeatherData(lat = null, lon = null) {
    // Use default coordinates if not provided
    const latitude = lat || "28.6139";
    const longitude = lon || "77.2090";

    try {
      console.log(`🌤️ Fetching weather for coordinates: ${latitude}, ${longitude}`);

      // Fetch current weather from OpenWeatherMap
      const weatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }

      const weatherData = await weatherResponse.json();
      console.log("✅ Weather API response:", weatherData);

      // Fetch hourly forecast
      const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);

      let hourlyWeather = [];
      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        hourlyWeather = this.processHourlyForecast(forecastData);
        console.log("✅ Hourly forecast loaded:", hourlyWeather.length, "entries");
      } else {
        console.warn("⚠️ Hourly forecast not available");
        hourlyWeather = [];
      }

      return {
        current: this.processCurrentWeather(weatherData),
        hourly: hourlyWeather,
      };
    } catch (error) {
      console.error("❌ Error fetching weather data:", error);
      return this.getFallbackWeatherData();
    }
  }

  processCurrentWeather(data) {
    // Map OpenWeatherMap weather codes to emojis
    const weatherIcon = this.getWeatherIcon(data.weather[0].id, data.weather[0].main);

    // Calculate precipitation chance based on weather conditions
    const precipChance = this.calculatePrecipitationChance(data);

    // Get precipitation amount (rain or snow in last hour)
    let precipitation = 0;
    if (data.rain && data.rain["1h"]) {
      precipitation = Math.round(data.rain["1h"]);
    } else if (data.snow && data.snow["1h"]) {
      precipitation = Math.round(data.snow["1h"]);
    }

    return {
      temperature: Math.round(data.main.temp),
      precipitation: precipitation,
      chance: precipChance,
      icon: weatherIcon,
      location: data.name || "Unknown Location",
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      clouds: data.clouds.all,
    };
  }

  calculatePrecipitationChance(data) {
    // Estimate precipitation chance based on weather condition codes
    const weatherId = data.weather[0].id;
    const clouds = data.clouds.all;

    // Thunderstorm (200-299): High chance
    if (weatherId >= 200 && weatherId < 300) {
      return Math.min(90 + Math.floor(Math.random() * 10), 100);
    }

    // Drizzle (300-399): Medium-high chance
    if (weatherId >= 300 && weatherId < 400) {
      return 60 + Math.floor(Math.random() * 20);
    }

    // Rain (500-599): High chance
    if (weatherId >= 500 && weatherId < 600) {
      if (weatherId === 500) return 40 + Math.floor(Math.random() * 20); // Light rain
      if (weatherId === 501) return 60 + Math.floor(Math.random() * 20); // Moderate rain
      return 80 + Math.floor(Math.random() * 20); // Heavy rain
    }

    // Snow (600-699): High chance
    if (weatherId >= 600 && weatherId < 700) {
      return 70 + Math.floor(Math.random() * 30);
    }

    // Clear sky (800): Low chance based on humidity
    if (weatherId === 800) {
      const humidity = data.main.humidity;
      if (humidity > 80) return Math.floor(Math.random() * 20);
      if (humidity > 60) return Math.floor(Math.random() * 10);
      return 0;
    }

    // Clouds (801-804): Chance increases with cloud coverage
    if (weatherId > 800) {
      if (clouds > 80) return 30 + Math.floor(Math.random() * 20); // Overcast
      if (clouds > 60) return 15 + Math.floor(Math.random() * 15); // Broken clouds
      if (clouds > 40) return 5 + Math.floor(Math.random() * 10);  // Scattered clouds
      return 0 + Math.floor(Math.random() * 5); // Few clouds
    }

    // Default: use cloud coverage as rough estimate
    return Math.min(Math.floor(clouds / 2), 50);
  }

  processHourlyForecast(forecastData) {
    // OpenWeatherMap returns 3-hour intervals
    const hourlyData = [];

    for (let i = 0; i < Math.min(24, forecastData.list.length); i++) {
      const entry = forecastData.list[i];
      const date = new Date(entry.dt * 1000);

      // Calculate precipitation chance for this time slot
      const precipChance = this.calculatePrecipitationChance(entry);

      // Get precipitation amount
      let precipitation = 0;
      if (entry.rain && entry.rain["3h"]) {
        precipitation = Math.round(entry.rain["3h"]);
      } else if (entry.snow && entry.snow["3h"]) {
        precipitation = Math.round(entry.snow["3h"]);
      }

      hourlyData.push({
        time: date.toTimeString().substring(0, 5),
        icon: this.getWeatherIcon(entry.weather[0].id, entry.weather[0].main),
        temperature: Math.round(entry.main.temp),
        precipitation: precipitation,
        chance: precipChance,
        description: entry.weather[0].description,
        clouds: entry.clouds.all,
      });
    }

    return hourlyData;
  }

  getWeatherIcon(weatherCode, weatherMain) {
    // OpenWeatherMap weather condition codes
    if (weatherCode >= 200 && weatherCode < 300) {
      return "⛈️"; // Thunderstorm
    } else if (weatherCode >= 300 && weatherCode < 400) {
      return "🌧️"; // Drizzle
    } else if (weatherCode >= 500 && weatherCode < 600) {
      return "🌧️"; // Rain
    } else if (weatherCode >= 600 && weatherCode < 700) {
      return "❄️"; // Snow
    } else if (weatherCode >= 700 && weatherCode < 800) {
      return "🌫️"; // Atmosphere (fog, mist, etc.)
    } else if (weatherCode === 800) {
      return "☀️"; // Clear sky
    } else if (weatherCode === 801) {
      return "🌤️"; // Few clouds
    } else if (weatherCode === 802) {
      return "⛅"; // Scattered clouds
    } else if (weatherCode >= 803) {
      return "☁️"; // Broken/overcast clouds
    }

    return "☀️"; // Default
  }

  getFallbackWeatherData() {
    return {
      current: {
        temperature: 25,
        precipitation: 0,
        chance: 10,
        icon: "☀️",
        location: "Default Location",
        description: "Clear sky",
      },
      hourly: [],
    };
  }
}
