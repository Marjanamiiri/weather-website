document.addEventListener("DOMContentLoaded", function () {
    // Set default city (Vancouver) when the page loads
    const defaultCity = "Vancouver";
    fetchWeatherData(defaultCity);
});

function fetchWeatherData(city) {
    const apiKey = "f86a2dd1d106b41ca48ece3220fe8216";

    fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
    )
    .then(response => response.json())
    .then(data => displayWeatherData(data))
    .catch(error => console.error("Error fetching weather:", error));
}

// ... (your existing JavaScript code) ...

function displayWeatherData(data) {
    const { name } = data;
    const { icon, description } = data.weather[0];
    const { temp, humidity } = data.main;
    const { speed } = data.wind;
    const { sunrise, sunset } = data.sys;

    // Convert sunrise and sunset times to human-readable format
    const sunriseTime = new Date(sunrise * 1000).toLocaleTimeString();
    const sunsetTime = new Date(sunset * 1000).toLocaleTimeString();

    // Get the current date and time
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    document.querySelector(".city").innerText = "Weather in " + name;
    document.querySelector(".icon").src =
        "https://openweathermap.org/img/wn/" + icon + ".png";
    document.querySelector(".description").innerText = description;
    document.querySelector(".temp").innerText = temp + "°C";
    document.querySelector(".humidity").innerText =
        "Humidity: " + humidity + "%";
    document.querySelector(".wind").innerText =
        "Wind speed: " + speed + " km/h";
    document.querySelector(".sunrise").innerText =
        "Sunrise: " + sunriseTime;
    document.querySelector(".sunset").innerText =
        "Sunset: " + sunsetTime;
    document.querySelector(".current-date").innerText = currentDate; // Add current date
    document.querySelector(".current-time").innerText = currentTime; // Add current time
    document.querySelector(".weather").classList.remove("loading");
    document.body.style.backgroundImage =
        "url('https://source.unsplash.com/1600x900/?" + name + "')";
}

// ... (your existing JavaScript code) ...

function searchWeather() {
    const cityInput = document.getElementById("cityInput").value;
    if (cityInput && /^[a-zA-Z\s]+$/.test(cityInput)) {
        fetchWeatherData(cityInput);
    } else {
        alert("Please enter a valid city name!");
    }
}

