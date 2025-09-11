/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

const API_KEY = "cd5743655e1a5d90679cffd3f85fa4fd";

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

        // Get location name
        const locationName = await this.getLocationName(lat, lon);

        return { lat, lon, locationName };
      } else {
        throw new Error("Geolocation not supported");
      }
    } catch (error) {
      console.warn("Location detection failed:", error);
      return {
        lat: "19.0760", // Mumbai fallback
        lon: "72.8777",
        locationName: "Location access denied - using default",
      };
    }
  }

  async getLocationName(lat, lon) {
    if (!this.rpc) return "Unknown Location";

    try {
      const locationData = await this.rpc(
        "/golfzon/dashboard/detect_location",
        {
          lat: lat,
          lon: lon,
        }
      );
      return locationData.success ? locationData.location : "Unknown Location";
    } catch (error) {
      console.warn("Location name detection failed:", error);
      return "Unknown Location";
    }
  }

  async fetchWeatherData(lat = null, lon = null) {
    if (!this.rpc) {
      return this.getFallbackWeatherData();
    }

    try {
      const weatherData = await this.rpc("/golfzon/dashboard/golf_info", {
        lat: lat,
        lon: lon,
      });

      return {
        current: weatherData.weather,
        hourly: weatherData.hourlyWeather,
      };
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return this.getFallbackWeatherData();
    }
  }

  getFallbackWeatherData() {
    const baseTime = new Date();
    baseTime.setMinutes(0, 0, 0);

    const hourlyWeather = [];
    for (let i = 0; i < 24; i++) {
      const time = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
      hourlyWeather.push({
        time: time.toTimeString().substring(0, 5),
        icon: i < 6 || i > 18 ? "🌙" : i > 10 && i < 16 ? "☀️" : "⛅",
        temperature: Math.round(20 + Math.sin(((i - 6) * Math.PI) / 12) * 8),
        precipitation: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0,
        chance: Math.floor(Math.random() * 30),
      });
    }

    return {
      current: {
        temperature: 25,
        precipitation: 0,
        chance: 10,
        icon: "☀️",
        location: "Default Location",
      },
      hourly: hourlyWeather,
    };
  }
}
