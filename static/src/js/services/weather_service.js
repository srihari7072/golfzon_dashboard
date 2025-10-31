/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";

export class WeatherService {
    constructor(rpcService) {
        this.rpc = rpcService;
        
        // ✅ DEFAULT LOCATION: Seoul, South Korea (only used when GPS fails completely)
        this.DEFAULT_LOCATION = {
            lat: "37.5665",
            lon: "126.9780",
            name: "Seoul",
            country: "KR"
        };
    }

    /**
     * ✅ Detect user location - USE ANY GPS RESULT
     * Only fall back to Seoul if GPS completely fails
     */
    async detectUserLocation() {
        try {
            console.log("🌍 Requesting GPS location (worldwide support)...");
            
            if (!navigator.geolocation) {
                console.warn("⚠️ Geolocation not supported, using Seoul");
                return this._getSeoulLocation();
            }

            // ✅ Request GPS location
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,  // Try to use GPS
                        timeout: 20000,             // 20 seconds timeout
                        maximumAge: 0               // Fresh location
                    }
                );
            });

            const lat = position.coords.latitude.toFixed(6);
            const lon = position.coords.longitude.toFixed(6);
            const accuracy = position.coords.accuracy;

            // ✅ USE ANY LOCATION RETURNED BY GPS (no accuracy check)
            console.log(`📍 GPS location detected: ${lat}, ${lon}`);
            console.log(`🎯 GPS accuracy: ${accuracy.toFixed(0)} meters`);
            
            if (accuracy > 100000) {
                console.warn(`⚠️ GPS accuracy is poor (${(accuracy/1000).toFixed(1)}km), but using it anyway`);
            }

            // Get location name from coordinates
            const locationName = await this.getLocationName(lat, lon);
            
            console.log(`✅ Using GPS location: ${locationName} (${lat}, ${lon})`);

            return {
                lat: lat,
                lon: lon,
                locationName: locationName,
                accuracy: accuracy,
                source: 'GPS'
            };

        } catch (error) {
            // ✅ GPS completely failed - now use Seoul
            console.error("❌ GPS request failed:", error.message);
            
            if (error.code === 1) {
                console.warn("⚠️ User denied location permission");
            } else if (error.code === 2) {
                console.warn("⚠️ Location unavailable (no GPS/WiFi/Network)");
            } else if (error.code === 3) {
                console.warn("⚠️ GPS request timeout (20 seconds)");
            }
            
            console.log("📍 Falling back to Seoul, South Korea (default)");
            return this._getSeoulLocation();
        }
    }

    /**
     * Get Seoul as fallback location
     */
    async _getSeoulLocation() {
        const { lat, lon } = this.DEFAULT_LOCATION;
        
        try {
            const locationName = await this.getLocationName(lat, lon);
            console.log(`✅ Using default location: ${locationName}`);
            
            return {
                lat: lat,
                lon: lon,
                locationName: locationName,
                accuracy: 0,
                source: 'default'
            };
        } catch (error) {
            // If weather API fails for Seoul, still return Seoul coordinates
            console.warn("⚠️ Could not resolve Seoul name, using coordinates");
            return {
                lat: lat,
                lon: lon,
                locationName: "Seoul, South Korea",
                accuracy: 0,
                source: 'default'
            };
        }
    }

    /**
     * Get location name from coordinates using OpenWeatherMap
     */
    async getLocationName(lat, lon) {
        try {
            const result = await rpc('/golfzon/weather/current', {
                lat: lat,
                lon: lon
            });
            
            if (result.success && result.data && result.data.name) {
                const cityName = result.data.name;
                const country = result.data.sys?.country || '';
                console.log(`✅ Location resolved: ${cityName}${country ? ', ' + country : ''}`);
                return country ? `${cityName}, ${country}` : cityName;
            }
            
            return "Unknown Location";
        } catch (error) {
            console.warn("⚠️ Failed to get location name:", error);
            return `Location (${lat.substring(0, 7)}, ${lon.substring(0, 7)})`;
        }
    }

    /**
     * Fetch weather data for coordinates
     */
    async fetchWeatherData(lat = null, lon = null) {
        // Use Seoul if no coordinates provided
        if (!lat || !lon) {
            console.warn("⚠️ No coordinates provided, using Seoul");
            lat = this.DEFAULT_LOCATION.lat;
            lon = this.DEFAULT_LOCATION.lon;
        }

        try {
            console.log(`🌤️ Fetching weather for: ${lat}, ${lon}`);

            const [weatherResult, forecastResult] = await Promise.all([
                rpc('/golfzon/weather/current', { lat: lat, lon: lon }),
                rpc('/golfzon/weather/forecast', { lat: lat, lon: lon })
            ]);

            if (!weatherResult.success) {
                throw new Error(weatherResult.message || "Weather API error");
            }

            console.log("✅ Weather API response received");

            let hourlyWeather = [];
            if (forecastResult.success) {
                hourlyWeather = this.processHourlyForecast(forecastResult.data);
                console.log(`✅ Generated ${hourlyWeather.length} hourly forecast entries`);
            } else {
                console.warn("⚠️ Hourly forecast not available");
            }

            return {
                current: this.processCurrentWeather(weatherResult.data),
                hourly: hourlyWeather,
            };
        } catch (error) {
            console.error("❌ Error fetching weather data:", error);
            
            // ✅ If weather API fails, try Seoul as fallback
            if (lat !== this.DEFAULT_LOCATION.lat || lon !== this.DEFAULT_LOCATION.lon) {
                console.log("🔄 Retrying with Seoul coordinates...");
                return this.fetchWeatherData(this.DEFAULT_LOCATION.lat, this.DEFAULT_LOCATION.lon);
            }
            
            throw error;
        }
    }

    /**
     * Process current weather data
     */
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
            country: data.sys?.country || '',
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6),
            clouds: data.clouds.all,
            feels_like: Math.round(data.main.feels_like),
            pressure: data.main.pressure,
            visibility: data.visibility ? data.visibility / 1000 : 0,
        };
    }

    /**
     * Calculate precipitation probability
     */
    calculatePrecipitationChance(data) {
        const weatherId = data.weather[0].id;
        const clouds = data.clouds.all;

        if (weatherId >= 200 && weatherId < 300) return Math.min(90 + Math.floor(Math.random() * 10), 100);
        if (weatherId >= 300 && weatherId < 400) return 60 + Math.floor(Math.random() * 20);
        if (weatherId >= 500 && weatherId < 600) {
            if (weatherId === 500) return 40 + Math.floor(Math.random() * 20);
            if (weatherId === 501) return 60 + Math.floor(Math.random() * 20);
            return 80 + Math.floor(Math.random() * 20);
        }
        if (weatherId >= 600 && weatherId < 700) return 70 + Math.floor(Math.random() * 30);
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

    /**
     * Process hourly forecast
     */
    processHourlyForecast(forecastData) {
        const hourlyData = [];
        const entries = forecastData.list.slice(0, 8);
        
        console.log(`📊 Converting ${entries.length} 3-hour forecasts to hourly`);
        
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const nextEntry = entries[i + 1];
            const startTime = new Date(entry.dt * 1000);
            
            for (let hour = 0; hour < 3; hour++) {
                const hourTime = new Date(startTime.getTime() + (hour * 60 * 60 * 1000));
                if (hourlyData.length >= 24) break;
                
                let temperature = Math.round(entry.main.temp);
                if (nextEntry && hour > 0) {
                    const tempDiff = nextEntry.main.temp - entry.main.temp;
                    const interpolated = entry.main.temp + (tempDiff * (hour / 3));
                    temperature = Math.round(interpolated);
                }
                
                let precipitation = 0;
                if (entry.rain && entry.rain["3h"]) {
                    precipitation = Math.round((entry.rain["3h"] / 3) * (hour + 1));
                } else if (entry.snow && entry.snow["3h"]) {
                    precipitation = Math.round((entry.snow["3h"] / 3) * (hour + 1));
                }
                
                hourlyData.push({
                    time: hourTime.toTimeString().substring(0, 5),
                    icon: this.getWeatherIcon(entry.weather[0].id, entry.weather[0].main),
                    temperature: temperature,
                    precipitation: precipitation,
                    chance: this.calculatePrecipitationChance(entry),
                    description: entry.weather[0].description,
                    clouds: entry.clouds.all,
                    wind_speed: Math.round(entry.wind.speed * 3.6),
                    humidity: entry.main.humidity
                });
            }
            
            if (hourlyData.length >= 24) break;
        }
        
        return hourlyData;
    }

    /**
     * Get weather icon
     */
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
}
