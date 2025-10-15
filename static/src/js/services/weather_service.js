/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";

/**
 * WeatherService - CORS-Free Weather API Integration
 * Uses Odoo backend proxy to fetch weather data from OpenWeatherMap
 * Solves CORS issues in production environments
 */
export class WeatherService {
    constructor(rpcService) {
        this.rpc = rpcService;
    }

    /**
     * Detect user's geolocation using browser API
     * @returns {Promise<Object>} Location object with lat, lon, locationName
     */
    async detectUserLocation() {
        try {
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                        enableHighAccuracy: true,
                        maximumAge: 600000, // Cache for 10 minutes
                    });
                });

                const lat = position.coords.latitude.toString();
                const lon = position.coords.longitude.toString();
                
                console.log(`✅ Geolocation detected: ${lat}, ${lon}`);
                
                // Get location name through backend proxy
                const locationName = await this.getLocationName(lat, lon);
                return { lat, lon, locationName };
            } else {
                throw new Error("Geolocation not supported");
            }
        } catch (error) {
            console.warn("⚠️ Location detection failed:", error);
            // Fallback to New Delhi coordinates
            return {
                lat: "28.6139",
                lon: "77.2090",
                locationName: "Location access denied - using default",
            };
        }
    }

    /**
     * Get location name from coordinates via backend proxy
     * @param {string} lat - Latitude
     * @param {string} lon - Longitude
     * @returns {Promise<string>} Location name
     */
    async getLocationName(lat, lon) {
        try {
            // ✅ Use Odoo RPC to backend proxy (NO CORS!)
            const result = await rpc('/golfzon/weather/current', {
                lat: lat,
                lon: lon
            });

            if (result.success && result.data && result.data.name) {
                console.log(`✅ Location name: ${result.data.name}`);
                return result.data.name;
            }
            return "Unknown Location";
        } catch (error) {
            console.warn("⚠️ Location name detection failed:", error);
            return "Unknown Location";
        }
    }

    /**
     * Fetch weather data (current + forecast) via backend proxy
     * @param {string} lat - Latitude (optional)
     * @param {string} lon - Longitude (optional)
     * @returns {Promise<Object>} Weather data with current and hourly forecasts
     */
    async fetchWeatherData(lat = null, lon = null) {
        const latitude = lat || "28.6139";
        const longitude = lon || "77.2090";

        try {
            console.log(`🌤️ Fetching weather for coordinates: ${latitude}, ${longitude}`);

            // ✅ Fetch through Odoo backend proxy (CORS-FREE!)
            const [weatherResult, forecastResult] = await Promise.all([
                rpc('/golfzon/weather/current', { lat: latitude, lon: longitude }),
                rpc('/golfzon/weather/forecast', { lat: latitude, lon: longitude })
            ]);

            // Check if weather API request was successful
            if (!weatherResult.success) {
                throw new Error(weatherResult.message || "Weather API error");
            }

            console.log("✅ Weather API response:", weatherResult.data);

            // Process hourly forecast if available
            let hourlyWeather = [];
            if (forecastResult.success) {
                hourlyWeather = this.processHourlyForecast(forecastResult.data);
                console.log("✅ Hourly forecast loaded:", hourlyWeather.length, "entries");
            } else {
                console.warn("⚠️ Hourly forecast not available");
            }

            return {
                current: this.processCurrentWeather(weatherResult.data),
                hourly: hourlyWeather,
            };
        } catch (error) {
            console.error("❌ Error fetching weather data:", error);
            return this.getFallbackWeatherData();
        }
    }

    /**
     * Process current weather data from API response
     * @param {Object} data - Weather API response
     * @returns {Object} Processed current weather data
     */
    processCurrentWeather(data) {
        const weatherIcon = this.getWeatherIcon(data.weather[0].id, data.weather[0].main);
        const precipChance = this.calculatePrecipitationChance(data);

        // Calculate precipitation amount (mm)
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

    /**
     * Calculate precipitation chance based on weather conditions
     * @param {Object} data - Weather data
     * @returns {number} Precipitation chance (0-100%)
     */
    calculatePrecipitationChance(data) {
        const weatherId = data.weather[0].id;
        const clouds = data.clouds.all;

        // Thunderstorm (200-299): 90-100%
        if (weatherId >= 200 && weatherId < 300) {
            return Math.min(90 + Math.floor(Math.random() * 10), 100);
        }

        // Drizzle (300-399): 60-80%
        if (weatherId >= 300 && weatherId < 400) {
            return 60 + Math.floor(Math.random() * 20);
        }

        // Rain (500-599): 40-100%
        if (weatherId >= 500 && weatherId < 600) {
            if (weatherId === 500) return 40 + Math.floor(Math.random() * 20); // Light rain
            if (weatherId === 501) return 60 + Math.floor(Math.random() * 20); // Moderate rain
            return 80 + Math.floor(Math.random() * 20); // Heavy rain
        }

        // Snow (600-699): 70-100%
        if (weatherId >= 600 && weatherId < 700) {
            return 70 + Math.floor(Math.random() * 30);
        }

        // Clear sky (800): 0-20% based on humidity
        if (weatherId === 800) {
            const humidity = data.main.humidity;
            if (humidity > 80) return Math.floor(Math.random() * 20);
            if (humidity > 60) return Math.floor(Math.random() * 10);
            return 0;
        }

        // Cloudy (801-804): 0-50% based on cloud coverage
        if (weatherId > 800) {
            if (clouds > 80) return 30 + Math.floor(Math.random() * 20);
            if (clouds > 60) return 15 + Math.floor(Math.random() * 15);
            if (clouds > 40) return 5 + Math.floor(Math.random() * 10);
            return 0 + Math.floor(Math.random() * 5);
        }

        // Default: based on cloud coverage
        return Math.min(Math.floor(clouds / 2), 50);
    }

    /**
     * Process hourly forecast data
     * @param {Object} forecastData - Forecast API response
     * @returns {Array} Array of hourly weather objects
     */
    processHourlyForecast(forecastData) {
        const hourlyData = [];
        
        // Process up to 24 hours of forecast
        for (let i = 0; i < Math.min(24, forecastData.list.length); i++) {
            const entry = forecastData.list[i];
            const date = new Date(entry.dt * 1000);
            const precipChance = this.calculatePrecipitationChance(entry);

            // Calculate precipitation amount (mm)
            let precipitation = 0;
            if (entry.rain && entry.rain["3h"]) {
                precipitation = Math.round(entry.rain["3h"]);
            } else if (entry.snow && entry.snow["3h"]) {
                precipitation = Math.round(entry.snow["3h"]);
            }

            hourlyData.push({
                time: date.toTimeString().substring(0, 5), // HH:MM format
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

    /**
     * Get weather emoji icon based on weather code
     * @param {number} weatherCode - OpenWeatherMap weather code
     * @param {string} weatherMain - Weather main category
     * @returns {string} Weather emoji icon
     */
    getWeatherIcon(weatherCode, weatherMain) {
        // Thunderstorm (200-299)
        if (weatherCode >= 200 && weatherCode < 300) return "⛈️";
        
        // Drizzle (300-399)
        if (weatherCode >= 300 && weatherCode < 400) return "🌧️";
        
        // Rain (500-599)
        if (weatherCode >= 500 && weatherCode < 600) return "🌧️";
        
        // Snow (600-699)
        if (weatherCode >= 600 && weatherCode < 700) return "❄️";
        
        // Atmosphere/Fog (700-799)
        if (weatherCode >= 700 && weatherCode < 800) return "🌫️";
        
        // Clear sky (800)
        if (weatherCode === 800) return "☀️";
        
        // Few clouds (801)
        if (weatherCode === 801) return "🌤️";
        
        // Scattered clouds (802)
        if (weatherCode === 802) return "⛅";
        
        // Broken/overcast clouds (803-804)
        if (weatherCode >= 803) return "☁️";
        
        // Default: sunny
        return "☀️";
    }

    /**
     * Get fallback weather data when API fails
     * @returns {Object} Default weather data
     */
    getFallbackWeatherData() {
        console.warn("⚠️ Using fallback weather data");
        return {
            current: {
                temperature: 25,
                precipitation: 0,
                chance: 10,
                icon: "☀️",
                location: "Default Location",
                description: "Clear sky",
                humidity: 50,
                windSpeed: 10,
                clouds: 0,
            },
            hourly: [],
        };
    }
}
