// Weather App Configuration - Using Open-Meteo (NO API KEY REQUIRED!)
const CONFIG = {
    WEATHER_API: 'https://api.open-meteo.com/v1',
    GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1',
    DEFAULT_CITY: 'London',
    UNITS: 'metric'
};

// DOM Elements
const citySearch = document.getElementById('citySearch');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const currentWeather = document.getElementById('currentWeather');
const forecastContainer = document.getElementById('forecastContainer');
const airQuality = document.getElementById('airQuality');

class WeatherApp {
    constructor() {
        this.map = null;
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.initMap();
            this.loadWeatherForCity(CONFIG.DEFAULT_CITY);
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize the app');
        }
    }

    setupEventListeners() {
        searchBtn.addEventListener('click', () => this.handleSearch());
        citySearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        locationBtn.addEventListener('click', () => this.getLocationWeather());
    }

    handleSearch() {
        const city = citySearch.value.trim();
        if (city) {
            this.loadWeatherForCity(city);
        }
    }

    async loadWeatherForCity(city) {
        try {
            this.showLoading();
            
            // First, get coordinates for the city
            const geoData = await this.fetchGeocodingData(city);
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('City not found');
            }
            
            const location = geoData.results[0];
            const { latitude, longitude, name, country, admin1 } = location;
            
            // Fetch weather data
            const weatherData = await this.fetchWeatherData(latitude, longitude);
            
            // Display all data
            this.displayCurrentWeather(weatherData, name, country, admin1);
            this.displayForecast(weatherData);
            this.displayAirQuality(weatherData);
            this.updateMap(latitude, longitude);
            
        } catch (error) {
            console.error('Error loading weather:', error);
            this.showError(error.message);
        }
    }

    async fetchGeocodingData(city) {
        const response = await fetch(
            `${CONFIG.GEOCODING_API}/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        
        if (!response.ok) {
            throw new Error('Failed to search for city');
        }
        
        return response.json();
    }

    async fetchWeatherData(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
            hourly: 'temperature_2m,precipitation_probability,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            timezone: 'auto'
        });
        
        const response = await fetch(`${CONFIG.WEATHER_API}/forecast?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }
        
        return response.json();
    }

    getWeatherDescription(code) {
        const weatherCodes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        return weatherCodes[code] || 'Unknown';
    }

    getWeatherIcon(code, isDay = true) {
        const iconMap = {
            0: isDay ? '☀️' : '🌙',
            1: isDay ? '🌤️' : '🌙',
            2: '⛅',
            3: '☁️',
            45: '🌫️',
            48: '🌫️',
            51: '🌦️',
            53: '🌦️',
            55: '🌧️',
            61: '🌧️',
            63: '🌧️',
            65: '🌧️',
            71: '🌨️',
            73: '🌨️',
            75: '❄️',
            77: '❄️',
            80: '🌦️',
            81: '🌧️',
            82: '⛈️',
            85: '🌨️',
            86: '❄️',
            95: '⛈️',
            96: '⛈️',
            99: '⛈️'
        };
        
        return iconMap[code] || '❓';
    }

    displayCurrentWeather(data, city, country, region) {
        if (!data?.current) {
            this.showError('Invalid weather data');
            return;
        }

        const current = data.current;
        const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
        
        try {
            const html = `
                <div class="weather-main">
                    <div class="weather-icon-container">
                        <div class="weather-emoji">${this.getWeatherIcon(current.weather_code, isDay)}</div>
                        <div class="temperature">${Math.round(current.temperature_2m)}°C</div>
                    </div>
                    <div class="weather-details">
                        <h2>${city || 'Unknown Location'}${region ? `, ${region}` : ''}${country ? `, ${country}` : ''}</h2>
                        <p class="description">${this.getWeatherDescription(current.weather_code)}</p>
                        <div class="details-grid">
                            <div class="detail-item">
                                <span>Feels Like</span>
                                <strong>${Math.round(current.apparent_temperature)}°C</strong>
                            </div>
                            <div class="detail-item">
                                <span>Humidity</span>
                                <strong>${current.relative_humidity_2m}%</strong>
                            </div>
                            <div class="detail-item">
                                <span>Wind Speed</span>
                                <strong>${current.wind_speed_10m} km/h</strong>
                            </div>
                            <div class="detail-item">
                                <span>Pressure</span>
                                <strong>${Math.round(current.pressure_msl)} hPa</strong>
                            </div>
                            <div class="detail-item">
                                <span>Cloud Cover</span>
                                <strong>${current.cloud_cover}%</strong>
                            </div>
                            <div class="detail-item">
                                <span>Precipitation</span>
                                <strong>${current.precipitation} mm</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            currentWeather.innerHTML = html;
        } catch (error) {
            console.error('Error displaying weather:', error);
            this.showError('Error displaying weather data');
        }
    }

    displayForecast(data) {
        if (!data?.daily) {
            return;
        }

        const daily = data.daily;
        let html = '';
        
        // Display next 5 days
        for (let i = 1; i <= 5 && i < daily.time.length; i++) {
            const date = new Date(daily.time[i]);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            html += `
                <div class="forecast-day">
                    <div class="forecast-date">${dayName}, ${dateStr}</div>
                    <div class="weather-emoji">${this.getWeatherIcon(daily.weather_code[i], true)}</div>
                    <div class="forecast-temp">
                        <span class="max">${Math.round(daily.temperature_2m_max[i])}°</span> / 
                        <span class="min">${Math.round(daily.temperature_2m_min[i])}°</span>
                    </div>
                    <div class="forecast-description">${this.getWeatherDescription(daily.weather_code[i])}</div>
                    <div class="precipitation-prob">💧 ${daily.precipitation_probability_max[i]}%</div>
                </div>
            `;
        }
        
        forecastContainer.innerHTML = html;
    }

    displayAirQuality(data) {
        if (!data?.current) {
            return;
        }

        const current = data.current;
        
        const html = `
            <h3>Weather Conditions</h3>
            <div class="weather-conditions">
                <div class="detail-item">
                    <span>Visibility</span>
                    <strong>${current.cloud_cover < 20 ? 'Excellent' : current.cloud_cover < 50 ? 'Good' : 'Limited'}</strong>
                </div>
                <div class="detail-item">
                    <span>UV Risk</span>
                    <strong>${current.cloud_cover < 30 ? 'High' : current.cloud_cover < 70 ? 'Moderate' : 'Low'}</strong>
                </div>
                <div class="detail-item">
                    <span>Outdoor Activity</span>
                    <strong>${current.precipitation > 0 ? 'Not Ideal' : 'Good'}</strong>
                </div>
                <div class="detail-item">
                    <span>Wind Direction</span>
                    <strong>${this.getWindDirection(current.wind_direction_10m)}</strong>
                </div>
            </div>
        `;
        
        airQuality.innerHTML = html;
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    initMap() {
        try {
            if (typeof L === 'undefined') {
                console.warn('Leaflet maps not loaded, skipping map initialization');
                return;
            }
            this.map = L.map('weatherMap').setView([51.505, -0.09], 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
        } catch (error) {
            console.warn('Error initializing map:', error);
        }
    }

    updateMap(lat, lon) {
        if (!this.map) return;

        try {
            this.map.setView([lat, lon], 10);
            
            // Clear existing markers
            this.map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    this.map.removeLayer(layer);
                }
            });
            
            // Add new marker
            L.marker([lat, lon]).addTo(this.map);
        } catch (error) {
            console.warn('Error updating map:', error);
        }
    }

    async getLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser');
            return;
        }
        
        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    
                    // Fetch weather data
                    const weatherData = await this.fetchWeatherData(latitude, longitude);
                    
                    // Reverse geocoding to get city name
                    const geoResponse = await fetch(
                        `${CONFIG.GEOCODING_API}/reverse?latitude=${latitude}&longitude=${longitude}&format=json`
                    );
                    const geoData = await geoResponse.json();
                    
                    const location = geoData.results[0];
                    
                    // Display all data
                    this.displayCurrentWeather(weatherData, location.name || location.city || 'Unknown', location.country || '', location.admin1 || '');
                    this.displayForecast(weatherData);
                    this.displayAirQuality(weatherData);
                    this.updateMap(latitude, longitude);
                    
                    // Update search box
                    citySearch.value = location.name || location.city || '';
                    
                } catch (error) {
                    console.error('Error getting location weather:', error);
                    this.showError('Failed to fetch weather data');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showError('Unable to retrieve your location');
            }
        );
    }

    showLoading() {
        currentWeather.innerHTML = '<div class="loading">Loading weather data...</div>';
        forecastContainer.innerHTML = '';
        airQuality.innerHTML = '';
    }

    showError(message) {
        currentWeather.innerHTML = `<div class="error">Error: ${message}</div>`;
        forecastContainer.innerHTML = '';
        airQuality.innerHTML = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});