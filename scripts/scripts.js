const defaultCity = "Vancouver";
const forecastViews = ["current", "hourly", "7days", "14days", "weekend", "monthly", "condition"];
let activeView = "current";
let weatherState = null;

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    elements.cityInput = document.getElementById("cityInput");
    elements.searchButton = document.getElementById("searchButton");
    elements.locationButton = document.getElementById("locationButton");
    elements.statusMessage = document.querySelector(".status-message");
    elements.weatherCard = document.querySelector(".weather-card");
    elements.city = document.querySelector(".city");
    elements.icon = document.querySelector(".icon");
    elements.description = document.querySelector(".description");
    elements.temp = document.querySelector(".temp");
    elements.tempVisual = document.querySelector(".temp-visual");
    elements.conditionVisual = document.querySelector(".condition-visual");
    elements.feelsLike = document.querySelector(".feels-like");
    elements.humidity = document.querySelector(".humidity");
    elements.wind = document.querySelector(".wind");
    elements.sunrise = document.querySelector(".sunrise");
    elements.sunset = document.querySelector(".sunset");
    elements.currentDate = document.querySelector(".current-date");
    elements.currentTime = document.querySelector(".current-time");
    elements.forecastLinks = document.querySelectorAll(".forecast-link");
    elements.viewLabel = document.querySelector(".view-label");
    elements.forecastCaption = document.querySelector(".forecast-caption");
    elements.forecastContent = document.querySelector(".forecast-content");

    elements.searchButton.addEventListener("click", searchWeather);
    elements.locationButton.addEventListener("click", fetchWeatherForCurrentLocation);
    elements.cityInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchWeather();
        }
    });
    elements.forecastLinks.forEach((link) => {
        link.addEventListener("click", () => setActiveView(link.dataset.view));
    });

    updateDateTime();
    window.setInterval(updateDateTime, 1000);
    fetchWeatherByCity(defaultCity);
});

async function fetchWeatherByCity(city) {
    setLoadingState(true);
    setStatus(`Searching for ${city}...`);

    try {
        const location = await geocodeCity(city);
        const weatherData = await fetchWeatherData(location.latitude, location.longitude);
        const resolvedLocation = {
            ...location,
            name: location.name,
            country: location.country,
            admin1: location.admin1
        };

        displayWeatherData(weatherData, resolvedLocation);
        setStatus(`Showing weather for ${resolvedLocation.name}.`);
    } catch (error) {
        handleWeatherError(error);
    }
}

async function fetchWeatherByCoordinates(latitude, longitude) {
    setLoadingState(true);
    setStatus("Loading weather for your current location...");

    try {
        const weatherData = await fetchWeatherData(latitude, longitude);
        let location = await reverseGeocode(latitude, longitude);

        if (isGenericLocationName(location.name)) {
            const approxLocation = await fetchApproximateLocationByIp().catch(() => null);
            location = mergeLocationWithApproximate(location, approxLocation);
        }

        displayWeatherData(weatherData, location);
        setStatus(`Showing weather for ${location.name}.`);
    } catch (error) {
        handleWeatherError(error);
    }
}

async function fetchWeatherData(latitude, longitude) {
    const params = new URLSearchParams({
        latitude,
        longitude,
        current: [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "wind_speed_10m",
            "weather_code",
            "is_day"
        ].join(","),
        hourly: [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation_probability",
            "weather_code"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "sunrise",
            "sunset",
            "precipitation_probability_max"
        ].join(","),
        timezone: "auto",
        forecast_days: "14"
    });

    const data = await fetchJson(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
        "Unable to load forecast data. Check your internet connection and try again."
    );

    return data;
}

async function geocodeCity(city) {
    const data = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
        "Unable to search for cities right now. Check your internet connection and try again."
    );

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Try a different search.");
    }

    return data.results[0];
}

async function reverseGeocode(latitude, longitude) {
    try {
        const data = await fetchJson(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`,
            "Unable to identify the nearest city for your location."
        );

        if (!data.results || data.results.length === 0) {
            return {
                name: "Your Location",
                country: "",
                admin1: ""
            };
        }

        return data.results[0];
    } catch (error) {
        return {
            name: "Your Location",
            country: "",
            admin1: ""
        };
    }
}

function displayWeatherData(data, location) {
    const current = data.current;
    const daily = data.daily;
    const cityName = [location.name, location.admin1, location.country].filter(Boolean).join(", ");
    const currentCondition = getWeatherCondition(current.weather_code, current.is_day);
    const sunriseTime = formatLocalTime(daily.sunrise[0]);
    const sunsetTime = formatLocalTime(daily.sunset[0]);

    elements.city.textContent = cityName;
    elements.icon.src = getWeatherIcon(current.weather_code, current.is_day);
    elements.icon.alt = currentCondition.label;
    elements.description.textContent = currentCondition.label;
    elements.temp.textContent = `${Math.round(current.temperature_2m)}°C`;
    elements.tempVisual.textContent = `${Math.round(current.temperature_2m)}°C`;
    elements.conditionVisual.textContent = currentCondition.label;
    elements.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    elements.sunrise.textContent = sunriseTime;
    elements.sunset.textContent = sunsetTime;

    weatherState = { data, location };
    renderActiveView();

    document.body.style.backgroundImage =
        `linear-gradient(135deg, rgba(11, 29, 38, 0.65), rgba(90, 117, 101, 0.4)), url("https://source.unsplash.com/1600x900/?${encodeURIComponent(location.name || "weather")}")`;

    setLoadingState(false);
}

function searchWeather() {
    const cityInput = elements.cityInput.value.trim();

    if (!cityInput) {
        setStatus("Enter a city name to search.", true);
        elements.cityInput.focus();
        return;
    }

    fetchWeatherByCity(cityInput);
}

function fetchWeatherForCurrentLocation() {
    setLoadingState(true);

    if (!navigator.geolocation) {
        fetchWeatherByApproximateLocation("Geolocation is not supported here. Using approximate location instead.");
        return;
    }

    setStatus("Requesting your current location...");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoordinates(latitude, longitude);
        },
        async () => {
            await fetchWeatherByApproximateLocation(
                "Precise location was unavailable. Showing approximate location based on your network."
            );
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

async function fetchWeatherByApproximateLocation(message) {
    setStatus(message);

    try {
        const approxLocation = await fetchApproximateLocationByIp();
        const weatherData = await fetchWeatherData(approxLocation.latitude, approxLocation.longitude);
        const location = await reverseGeocode(approxLocation.latitude, approxLocation.longitude);
        const resolvedLocation = mergeLocationWithApproximate(location, approxLocation);

        displayWeatherData(weatherData, resolvedLocation);
        setStatus(`Showing weather for ${resolvedLocation.name} (approximate location).`);
    } catch (error) {
        handleWeatherError(new Error("Unable to detect your location automatically. Please search for your city."));
    }
}

async function fetchApproximateLocationByIp() {
    const data = await fetchJson(
        "https://ipapi.co/json/",
        "Approximate location lookup failed."
    );

    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
        throw new Error("Approximate location lookup failed.");
    }

    return data;
}

function mergeLocationWithApproximate(location, approxLocation) {
    if (!approxLocation) {
        return {
            ...location,
            name: location.name || "Your Area"
        };
    }

    return {
        ...location,
        name: isGenericLocationName(location.name) ? (approxLocation.city || "Your Area") : location.name,
        admin1: location.admin1 || approxLocation.region || approxLocation.region_code || "",
        country: location.country || approxLocation.country_name || approxLocation.country || ""
    };
}

function isGenericLocationName(name) {
    return !name || name === "Your Location" || name === "Your Area";
}

async function fetchJson(url, networkMessage) {
    let response;

    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(networkMessage);
    }

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(networkMessage);
    }

    if (!response.ok) {
        throw new Error(data.reason || data.error || data.message || networkMessage);
    }

    return data;
}

function updateDateTime() {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
    elements.currentTime.textContent = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function setActiveView(view) {
    if (!forecastViews.includes(view)) {
        return;
    }

    activeView = view;
    elements.forecastLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.view === view);
    });
    renderActiveView();
}

function renderActiveView() {
    if (!weatherState) {
        return;
    }

    const { data } = weatherState;
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    elements.viewLabel.textContent = getViewTitle(activeView);

    if (activeView === "current") {
        elements.forecastCaption.textContent = "Live snapshot from Open-Meteo";
        elements.forecastContent.innerHTML = `
            <div class="mini-grid">
                <article class="mini-card">
                    <p class="detail-label">Temperature</p>
                    <p>${Math.round(current.temperature_2m)}°C</p>
                </article>
                <article class="mini-card">
                    <p class="detail-label">Feels Like</p>
                    <p>${Math.round(current.apparent_temperature)}°C</p>
                </article>
                <article class="mini-card">
                    <p class="detail-label">Humidity</p>
                    <p>${Math.round(current.relative_humidity_2m)}%</p>
                </article>
                <article class="mini-card">
                    <p class="detail-label">Condition</p>
                    <p>${getWeatherCondition(current.weather_code, current.is_day).label}</p>
                </article>
            </div>
        `;
        return;
    }

    if (activeView === "hourly") {
        const cards = hourly.time.slice(0, 12).map((time, index) => createForecastCard({
            title: formatHour(time),
            value: `${Math.round(hourly.temperature_2m[index])}°C`,
            meta: `${hourly.precipitation_probability[index]}% rain chance`
        })).join("");

        elements.forecastCaption.textContent = "Next 12 hours";
        elements.forecastContent.innerHTML = `<div class="forecast-scroll">${cards}</div>`;
        return;
    }

    if (activeView === "7days" || activeView === "14days" || activeView === "weekend" || activeView === "monthly") {
        const cards = buildDailyCards(activeView, daily).map((entry) => createForecastCard(entry)).join("");
        elements.forecastCaption.textContent = getViewCaption(activeView);
        elements.forecastContent.innerHTML = `<div class="forecast-scroll">${cards}</div>`;
        return;
    }

    if (activeView === "condition") {
        const summary = summarizeConditions(daily.weather_code);
        elements.forecastCaption.textContent = "Condition mix across the next 14 days";
        elements.forecastContent.innerHTML = `
            <div class="mini-grid">
                ${summary.map((item) => `
                    <article class="mini-card">
                        <p class="detail-label">${item.label}</p>
                        <p>${item.days} day${item.days === 1 ? "" : "s"}</p>
                    </article>
                `).join("")}
            </div>
        `;
    }
}

function buildDailyCards(view, daily) {
    const base = daily.time.map((time, index) => ({
        date: time,
        title: formatDayLabel(time),
        value: `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`,
        meta: `${getWeatherCondition(daily.weather_code[index], 1).label} • ${daily.precipitation_probability_max[index]}%`
    }));

    if (view === "7days") {
        return base.slice(0, 7);
    }

    if (view === "14days" || view === "monthly") {
        return base.slice(0, 14);
    }

    return base.filter((entry) => {
        const day = new Date(entry.date).getDay();
        return day === 0 || day === 6;
    }).slice(0, 4);
}

function summarizeConditions(weatherCodes) {
    const counts = new Map();
    weatherCodes.forEach((code) => {
        const label = getWeatherCondition(code, 1).label;
        counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [...counts.entries()]
        .map(([label, days]) => ({ label, days }))
        .sort((a, b) => b.days - a.days)
        .slice(0, 4);
}

function createForecastCard(entry) {
    return `
        <article class="forecast-mini-card">
            <p class="detail-label">${entry.title}</p>
            <p class="forecast-main">${entry.value}</p>
            <p class="forecast-meta">${entry.meta}</p>
        </article>
    `;
}

function getViewTitle(view) {
    const titles = {
        current: "Current",
        hourly: "Hourly",
        "7days": "7 Days",
        "14days": "14 Days",
        weekend: "Weekend",
        monthly: "Monthly Forecast",
        condition: "Condition"
    };

    return titles[view] || "Current";
}

function getViewCaption(view) {
    const captions = {
        "7days": "Daily outlook for the week ahead",
        "14days": "Extended two-week forecast",
        weekend: "Upcoming weekend snapshot",
        monthly: "Best available long-range view from the next 14 days"
    };

    return captions[view] || "";
}

function formatLocalTime(value) {
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatHour(value) {
    return new Date(value).toLocaleTimeString([], {
        hour: "numeric"
    });
}

function formatDayLabel(value) {
    return new Date(value).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}

function getWeatherCondition(code, isDay) {
    const map = {
        0: { label: isDay ? "Clear Sky" : "Clear Night", icon: isDay ? "01d" : "01n" },
        1: { label: "Mostly Clear", icon: isDay ? "02d" : "02n" },
        2: { label: "Partly Cloudy", icon: isDay ? "03d" : "03n" },
        3: { label: "Overcast", icon: "04d" },
        45: { label: "Fog", icon: "50d" },
        48: { label: "Rime Fog", icon: "50d" },
        51: { label: "Light Drizzle", icon: "09d" },
        53: { label: "Drizzle", icon: "09d" },
        55: { label: "Heavy Drizzle", icon: "09d" },
        61: { label: "Light Rain", icon: "10d" },
        63: { label: "Rain", icon: "10d" },
        65: { label: "Heavy Rain", icon: "10d" },
        71: { label: "Light Snow", icon: "13d" },
        73: { label: "Snow", icon: "13d" },
        75: { label: "Heavy Snow", icon: "13d" },
        80: { label: "Rain Showers", icon: "09d" },
        81: { label: "Heavy Showers", icon: "09d" },
        82: { label: "Violent Showers", icon: "09d" },
        95: { label: "Thunderstorm", icon: "11d" },
        96: { label: "Storm With Hail", icon: "11d" },
        99: { label: "Severe Storm", icon: "11d" }
    };

    return map[code] || { label: "Variable Conditions", icon: "03d" };
}

function getWeatherIcon(code, isDay) {
    return `https://openweathermap.org/img/wn/${getWeatherCondition(code, isDay).icon}@2x.png`;
}

function handleWeatherError(error) {
    setLoadingState(false);
    setStatus(error.message || "Something went wrong while fetching weather data.", true);
    console.error("Error fetching weather:", error);
}

function setLoadingState(isLoading) {
    elements.weatherCard.classList.toggle("loading", isLoading);
    elements.searchButton.disabled = isLoading;
    elements.locationButton.disabled = isLoading;
}

function setStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.classList.toggle("error", isError);
}
