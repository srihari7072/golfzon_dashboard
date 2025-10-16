/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";

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
                        maximumAge: 600000,
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
            return {
                lat: "28.6139",
                lon: "77.2090",
                locationName: "Location access denied - using default",
            };
        }
    }

    async getLocationName(lat, lon) {
        try {
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

    async fetchWeatherData(lat = null, lon = null) {
        const latitude = lat || "28.6139";
        const longitude = lon || "77.2090";

        try {
            console.log(`🌤️ Fetching weather for coordinates: ${latitude}, ${longitude}`);

            const [weatherResult, forecastResult] = await Promise.all([
                rpc('/golfzon/weather/current', { lat: latitude, lon: longitude }),
                rpc('/golfzon/weather/forecast', { lat: latitude, lon: longitude })
            ]);

            if (!weatherResult.success) {
                throw new Error(weatherResult.message || "Weather API error");
            }

            console.log("✅ Weather API response:", weatherResult.data);

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

    processCurrentWeather(data) {
        const weatherIcon = this.getWeatherIcon(data.weather[0].id, data.weather[0].main);
        const precipChance = this.calculatePrecipitationChance(data);

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
        const weatherId = data.weather[0].id;
        const clouds = data.clouds.all;

        if (weatherId >= 200 && weatherId < 300) {
            return Math.min(90 + Math.floor(Math.random() * 10), 100);
        }

        if (weatherId >= 300 && weatherId < 400) {
            return 60 + Math.floor(Math.random() * 20);
        }

        if (weatherId >= 500 && weatherId < 600) {
            if (weatherId === 500) return 40 + Math.floor(Math.random() * 20); // Light rain
            if (weatherId === 501) return 60 + Math.floor(Math.random() * 20); // Moderate rain
            return 80 + Math.floor(Math.random() * 20); // Heavy rain
        }

        if (weatherId >= 600 && weatherId < 700) {
            return 70 + Math.floor(Math.random() * 30);
        }

        if (weatherId === 800) {
            const humidity = data.main.humidity;
            if (humidity > 80) return Math.floor(Math.random() * 20);
            if (humidity > 60) return Math.floor(Math.random() * 10);
            return 0;
        }

        if (weatherId > 800) {
            if (clouds > 80) return 30 + Math.floor(Math.random() * 20);
            if (clouds > 60) return 15 + Math.floor(Math.random() * 15);
            if (clouds > 40) return 5 + Math.floor(Math.random() * 10);
            return 0 + Math.floor(Math.random() * 5);
        }

        return Math.min(Math.floor(clouds / 2), 50);
    }

    processHourlyForecast(forecastData) {
        const hourlyData = [];
        
        for (let i = 0; i < Math.min(24, forecastData.list.length); i++) {
            const entry = forecastData.list[i];
            const date = new Date(entry.dt * 1000);
            const precipChance = this.calculatePrecipitationChance(entry);

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

    getWeatherIcon(weatherCode, weatherMain) {
        if (weatherCode >= 200 && weatherCode < 300) return "⛈️";
        
        if (weatherCode >= 300 && weatherCode < 400) return "🌧️";
        
        if (weatherCode >= 500 && weatherCode < 600) return "🌧️";
        
        if (weatherCode >= 600 && weatherCode < 700) return "❄️";
        
        if (weatherCode >= 700 && weatherCode < 800) return "🌫️";
        
        if (weatherCode === 800) return "☀️";
        
        if (weatherCode === 801) return "🌤️";
        
        if (weatherCode === 802) return "⛅";
        
        if (weatherCode >= 803) return "☁️";
        
        return "☀️";
    }

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
