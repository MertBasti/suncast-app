
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const addFavorite = document.getElementById("addFavorite");
const favoritesContainer = document.getElementById("favoritesContainer");
const locationButton = document.getElementById("locationButton");

let currentCity = "Ingolstadt";
let weatherChart = null;

const descriptions = {
  0: "Klarer Himmel",
  1: "Überwiegend sonnig",
  2: "Teilweise bewölkt",
  3: "Bewölkt",
  45: "Nebelig",
  48: "Nebelig",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  80: "Regenschauer",
  81: "Regenschauer",
  82: "Starke Regenschauer",
  95: "Gewitter"
};

// Passendes Wettersymbol auswählen
function getWeatherIcon(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "☁️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

// Automatische Wetterempfehlung
function showRecommendation(data) {
  const temperature = data.current.temperature_2m;
  const feelsLike = data.current.apparent_temperature;
  const code = data.current.weather_code;

  let icon = "☀️";
  let message = "Gutes Wetter für einen Spaziergang!";

  if (code >= 95) {
    icon = "⛈️";
    message = "Gewitter möglich! Bleib möglichst im Trockenen.";
  } else if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    icon = "☂️";
    message = "Nimm lieber einen Regenschirm mit!";
  } else if (code >= 71 && code <= 77) {
    icon = "❄️";
    message = "Schnee möglich! Zieh dich warm an.";
  } else if (feelsLike < 5) {
    icon = "🧥";
    message = "Es ist kalt! Eine warme Jacke ist empfehlenswert.";
  } else if (feelsLike < 15) {
    icon = "🧥";
    message = "Eine leichte Jacke wäre heute sinnvoll.";
  } else if (temperature >= 28) {
    icon = "☀️";
    message = "Es ist heiß! Denk an Wasser und Sonnenschutz.";
  }

  document.getElementById("recommendationIcon").textContent =
    icon;

  document.getElementById("recommendationText").textContent =
    message;
}

// Stadt über die Open-Meteo-API suchen
async function searchCity(city) {
  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search" +
      "?name=" + encodeURIComponent(city) +
      "&count=1&language=de&format=json";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Suche fehlgeschlagen");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      alert("Diese Stadt wurde nicht gefunden.");
      return;
    }

    const place = data.results[0];
    currentCity = place.name;

    await loadWeather(
      place.latitude,
      place.longitude,
      place.name
    );

  } catch (error) {
    console.error(error);
    alert("Die Ortssuche ist momentan nicht verfügbar.");
  }
}

// Wetterdaten abrufen
async function loadWeather(latitude, longitude, city) {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + latitude +
      "&longitude=" + longitude +
      "&current=temperature_2m,relative_humidity_2m," +
      "apparent_temperature,weather_code,wind_speed_10m" +
      "&hourly=temperature_2m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=5";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Wetterdaten fehlen");
    }

    const data = await response.json();

    currentCity = city;

    document.getElementById("cityName").textContent = city;

    document.getElementById("temperature").textContent =
      Math.round(data.current.temperature_2m);

    const code = data.current.weather_code;

    document.getElementById("weatherDescription").textContent =
      getWeatherIcon(code) + " " +
      (descriptions[code] || "Wetterdaten verfügbar");

    document.getElementById("weatherDetails").textContent =
      "Gefühlt " +
      Math.round(data.current.apparent_temperature) +
      "°C · Luftfeuchtigkeit " +
      data.current.relative_humidity_2m +
      "% · Wind " +
      Math.round(data.current.wind_speed_10m) +
      " km/h";

    showForecast(data.daily);
    showChart(data.hourly, data.current.time);
    showRecommendation(data);

    // Wetterdaten für Offline-Nutzung speichern
    localStorage.setItem("lastWeather", JSON.stringify({
      city: city,
      data: data
    }));

  } catch (error) {
    console.error(error);
    alert("Wetterdaten konnten nicht geladen werden.");
  }
}

// 5-Tage-Vorhersage anzeigen
function showForecast(daily) {
  const container = document.getElementById("forecastContainer");
  container.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + "T12:00:00");

    const day = date.toLocaleDateString("de-DE", {
      weekday: "short"
    });

    const card = document.createElement("div");
    card.className = "forecast-day";

    const dayLabel = document.createElement("p");
    dayLabel.textContent = day;

    const icon = document.createElement("div");
    icon.textContent = getWeatherIcon(daily.weather_code[i]);
    icon.style.fontSize = "28px";

    const temperature = document.createElement("p");
    temperature.textContent =
      Math.round(daily.temperature_2m_max[i]) + "° / " +
      Math.round(daily.temperature_2m_min[i]) + "°";

    card.append(dayLabel, icon, temperature);
    container.appendChild(card);
  }
}

// Temperaturdiagramm anzeigen
function showChart(hourly, currentTime) {
  if (typeof Chart === "undefined") return;

  const today = currentTime.slice(0, 10);
  const labels = [];
  const temperatures = [];

  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.time[i].startsWith(today)) {
      labels.push(hourly.time[i].slice(11, 16));
      temperatures.push(hourly.temperature_2m[i]);
    }
  }

  const canvas = document.getElementById("temperatureChart");

  if (weatherChart) {
    weatherChart.destroy();
  }

  weatherChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Temperatur in °C",
        data: temperatures,
        borderColor: "white",
        backgroundColor: "rgba(255,255,255,0.15)",
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "white" }
        }
      },
      scales: {
        x: {
          ticks: { color: "white", maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });
}

// Lieblingsorte speichern
function saveFavorite() {
  const favorites = JSON.parse(
    localStorage.getItem("favorites") || "[]"
  );

  if (!favorites.includes(currentCity)) {
    favorites.push(currentCity);
    localStorage.setItem(
      "favorites",
      JSON.stringify(favorites)
    );
  }

  showFavorites();
}

// Lieblingsorte anzeigen
function showFavorites() {
  const favorites = JSON.parse(
    localStorage.getItem("favorites") || "[]"
  );

  favoritesContainer.innerHTML = "";

  favorites.forEach(city => {
    const button = document.createElement("button");
    button.className = "favorite-city";
    button.textContent = city;

    button.addEventListener("click", () => {
      searchCity(city);
    });

    favoritesContainer.appendChild(button);
  });
}

// Suchfunktion
searchButton.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) searchCity(city);
});

cityInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) searchCity(city);
  }
});

addFavorite.addEventListener("click", saveFavorite);

// Gespeicherte Wetterdaten anzeigen
function showSavedWeather() {
  const saved = localStorage.getItem("lastWeather");

  if (!saved) {
    return false;
  }

  try {
    const weather = JSON.parse(saved);
    const data = weather.data;

    currentCity = weather.city;

    document.getElementById("cityName").textContent =
      weather.city;

    document.getElementById("temperature").textContent =
      Math.round(data.current.temperature_2m);

    const code = data.current.weather_code;

    document.getElementById("weatherDescription").textContent =
      getWeatherIcon(code) + " " +
      (descriptions[code] || "Wetterdaten verfügbar");

    document.getElementById("weatherDetails").textContent =
      "Gespeicherte Wetterdaten · Gefühlt " +
      Math.round(data.current.apparent_temperature) +
      "°C · Luftfeuchtigkeit " +
      data.current.relative_humidity_2m +
      "% · Wind " +
      Math.round(data.current.wind_speed_10m) +
      " km/h";

    showForecast(data.daily);
    showChart(data.hourly, data.current.time);
    showRecommendation(data);

    return true;

  } catch (error) {
    console.error("Gespeicherte Daten ungültig:", error);
    return false;
  }
}

// Standorterkennung
locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Dein Browser unterstützt keine Standorterkennung.");
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "Standort wird ermittelt...";

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        await loadWeather(
          position.coords.latitude,
          position.coords.longitude,
          "Mein Standort"
        );
      } finally {
        locationButton.disabled = false;
        locationButton.textContent = "📍 Mein Standort";
      }
    },
    () => {
      alert(
        "Standort konnte nicht ermittelt werden. " +
        "Bitte prüfe die Berechtigung."
      );

      locationButton.disabled = false;
      locationButton.textContent = "📍 Mein Standort";
    }
  );
});

// App starten
showFavorites();

const savedWeatherAvailable = showSavedWeather();

// Nur mit Internet neue Wetterdaten abrufen
if (navigator.onLine) {
  searchCity("Ingolstadt");
}

// Service Worker registrieren
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Service Worker aktiviert");
      })
      .catch(error => {
        console.error("Service Worker Fehler:", error);
      });
  });
}

/* Hell-/Dunkel-Modus */

const themeButton = document.getElementById("themeButton");

// Gespeicherte Einstellung laden
const savedTheme = localStorage.getItem("suncastTheme") || "dark";

function setTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");

  themeButton.textContent =
    theme === "light" ? "🌙 Dunkler Modus" : "☀️ Heller Modus";

  localStorage.setItem("suncastTheme", theme);
}

// Beim Start gespeichertes Design anwenden
setTheme(savedTheme);

// Design per Klick wechseln
themeButton.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light-mode");
  setTheme(isLight ? "dark" : "light");
});

/* Diagrammfarben an das Design anpassen */

function updateChartTheme() {
  if (!weatherChart) return;

  const isLight = document.body.classList.contains("light-mode");

  const textColor = isLight ? "#173653" : "#ffffff";
  const gridColor = isLight
    ? "rgba(23, 54, 83, 0.12)"
    : "rgba(255, 255, 255, 0.1)";

  weatherChart.data.datasets[0].borderColor = textColor;
  weatherChart.data.datasets[0].backgroundColor = isLight
    ? "rgba(23, 77, 123, 0.12)"
    : "rgba(255, 255, 255, 0.15)";

  weatherChart.options.plugins.legend.labels.color = textColor;
  weatherChart.options.scales.x.ticks.color = textColor;
  weatherChart.options.scales.y.ticks.color = textColor;
  weatherChart.options.scales.x.grid.color = gridColor;
  weatherChart.options.scales.y.grid.color = gridColor;

  weatherChart.update();
}

// Diagramm aktualisieren, wenn das Design gewechselt wird
themeButton.addEventListener("click", updateChartTheme);

// Auch bei neu geladenen Wetterdaten die Farben anpassen
const originalShowChart = showChart;

showChart = function(hourly, currentTime) {
  originalShowChart(hourly, currentTime);
  updateChartTheme();
};

// Bereits vorhandenes Diagramm aktualisieren
updateChartTheme();
