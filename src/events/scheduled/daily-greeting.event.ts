import cron from "node-cron";
import { env } from "process";
import { Client, Events } from "discord.js";

import MessageService from "@services/message.service";
import { WeatherREST } from "@interfaces/rest/weather/weather-rest.interface";
import { RawWeatherData } from "@interfaces/rest/weather/weather.interface";

// Environment Variables
const GUILD_ID: string = env.GUILD_ID;
const MESSAGE_CHANNEL_ID: string = env.NECO_MESSAGES_CHANNEL;
const WEATHER_API_URL: string = env.WEATHER_API_URL;

//API and Task Constants
const ALICANTE_COORDINATES: { latitude: number; longitude: number } = {
  latitude: 38.26,
  longitude: -0.71,
};
const FORECAST_DAYS: number = 1;
const DAILY_REQUESTED_PARAMS: string[] = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
];
const TIMEZONE: string = "Europe/Madrid";
const SCHEDULED_TIME: string = "40 14 * * *";

/**
 * Registers a cron job to post a daily greeting message at 12:00 PM Madrid time
 * and reward reactors with random points.
 *
 * @param client - The Discord.js Client instance used to access guilds and channels.
 */
export default function dailyGreeting(client: Client): void {
  // Every day at 12:00 PM Madrid time
  client.once(Events.ClientReady, () => {
    cron.schedule(SCHEDULED_TIME, async () => scheduledTask(client), {
      timezone: TIMEZONE,
    });
  });
}

/**
 * Executes the scheduled daily greeting task:
 *
 * @param client - The Discord.js Client instance.
 * @returns A Promise that resolves once the task completes or errors out.
 */
async function scheduledTask(client: Client): Promise<void> {
  try {
    // Validate required environment variables
    if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
      const err = "Missing environment variables for guild or message channel!";
      throw new Error(err);
    }

    if (!WEATHER_API_URL) {
      const err = "Missing environment variable for weather API URL!";
      throw new Error(err);
    }

    // Fetch and validate guild
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      const err = `Guild with ID ${GUILD_ID} not found in cache!`;
      throw new Error(err);
    }

    // Fetch and validate text-based channel
    const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      const err = `Channel with ID ${MESSAGE_CHANNEL_ID} not found or is not text-based!`;
      throw new Error(err);
    }

    // Validate daily greeting messages
    if (!Array.isArray(DAILY_MESSAGES) || DAILY_MESSAGES.length === 0) {
      const err = "Daily greeting messages array is invalid or empty!";
      throw new Error(err);
    }

    // Initialize message service
    const messageService = new MessageService(channel);

    // Determine today's index and fetch corresponding message
    const dayIndex = new Date().getDay();
    const dailyOptions = DAILY_MESSAGES[dayIndex];
    const messageContent = dailyOptions[Math.floor(Math.random() * dailyOptions.length)];

    // Fetch weather data and build weather message
    const weatherData = await fetchWeatherData();
    const weatherMessage = buildWeatherMessage(weatherData);

    // Validate message content
    if (!messageContent) {
      const err = "No message content found for today's greeting!";
      throw new Error(err);
    }

    if (!weatherMessage) {
      const err = "Failed to build weather message!";
      throw new Error(err);
    }

    // Combine greeting and weather messages
    const fullMessage = `${messageContent}\n\n${weatherMessage}`;

    // Post the greeting
    await messageService.send(fullMessage);
  } catch (error) {
    console.error("Error in daily greeting task:", error);
  }
}

async function fetchWeatherData(): Promise<WeatherREST> {
  const params: URLSearchParams = new URLSearchParams({
    latitude: ALICANTE_COORDINATES.latitude.toString(),
    longitude: ALICANTE_COORDINATES.longitude.toString(),
    daily: DAILY_REQUESTED_PARAMS.join(","),
    timezone: TIMEZONE,
    forecast_days: FORECAST_DAYS.toString(),
  });

  const url: string = `${WEATHER_API_URL}?${params.toString()}`;

  const response: Response = await fetch(url);

  if (!response.ok) {
    const err = `Failed to fetch weather data: ${response.statusText}`;
    throw new Error(err);
  }

  const data: WeatherREST = await response.json();

  if (!data || !data.daily) {
    const err = `Weather data is empty or invalid`;
    throw new Error(err);
  }

  if (!validateWeatherData(data)) {
    const err = `Weather data is missing required daily properties`;
    throw new Error(err);
  }

  return data;
}

function buildWeatherMessage(weatherData: WeatherREST): string {
  const rawWeatherData: RawWeatherData = {
    date: weatherData.daily.time[0],
    weatherCode: weatherData.daily.weather_code[0],
    maxTemperature: weatherData.daily.temperature_2m_max[0],
    minTemperature: weatherData.daily.temperature_2m_min[0],
    precipitationProbability: weatherData.daily.precipitation_probability_max[0],
  };

  const weatherMessage = `
  Hoy en Alicante:
  - Clima: ${WEATHER_DESCRIPTIONS[rawWeatherData.weatherCode] || "Desconocido"}
  - Temperatura Máxima: ${rawWeatherData.maxTemperature}°C
  - Temperatura Mínima: ${rawWeatherData.minTemperature}°C
  - Probabilidad de LLuvia: ${rawWeatherData.precipitationProbability}%
  -# Quieres saber el clima de otra ciudad? Sugierelo para añadirlo!
  `;

  return weatherMessage;
}

function validateWeatherData(data: WeatherREST): boolean {
  const requiredProps = [
    "time",
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
  ];

  return requiredProps.every((prop) => {
    const array = data.daily[prop as keyof typeof data.daily];
    return Array.isArray(array) && array.length > 0;
  });
}

/**
 * Array of daily greeting messages
 */
const DAILY_MESSAGES: string[][] = [
  // Domingo
  [
    "Domingo de Furros: ¿¡Quien decidio hacer esto fiesta nacional!? Aleja tus sucias patas de la pantalla!(◣_◢) ",
    "Domingo de Resaca: ¿Otra vez bebiendo hasta perder el conocimiento? ¡Tu hígado te odia! (╯°□°）╯︵ ┻━┻",
    "Domingo de Llorar en Silencio: ¿Por qué enfrentar la realidad cuando puedes llorar bajo las sábanas? Nyaa~ (╥﹏╥)",
  ],

  // Lunes
  [
    "Lunes de pensamientos suicidas y existencialismo barato. ¡Vamos equipo! Solo 6 días más para volver a querer morirte el lunes siguiente. Nyaa~",
    "Lunes de Programacion: ¿Cuantas veces piensas hacer ese `while(true)`???? Aprende a programar plz. (=｀ω´=)",
    "Lunes de No He Dormido Nada: ¿Quién necesita dormir? ¡Aguanta con 3 latas de Monster y un par de lágrimas! (╯°□°）╯︵ ┻━┻",
    "Lunes de Café y Desesperación: ¡Tu café tiene más lágrimas que azúcar! ¡Aguanta, que solo son 5 días más! (≧∇≦)ﾉ",
  ],

  // Martes
  [
    "Martes de adoracion a Astolfo. Hora de cuestionarte cosas y dejar de negar la realidad. Tú decides, yo sólo observo desde las sombras. (=ↀωↀ=)",
    "Martes de Negación: Seguro hoy será productivo, ¿verdad? ¡Mentira! Todos sabemos que terminarás viendo memes. (≡^ω^≡)",
    "Martes de Procrastinación: ¿Por qué hacer hoy lo que puedes dejar para mañana? ¡El arte de posponer es una habilidad! (¬‿¬)",
  ],

  // Miércoles
  [
    "Miercoles de Minecraft: El servidor se hizo para esto! ¡Hora de minar y construir hasta el amanecer! (≧◡≦)",
    "Miércoles de Factorío: ¿Cuantas horas más piensas perder en la fábrica hoy? ¡La producción de circuitos no se hace sola! ╾━╤デ╦︻",
    "Miércoles de Trauma Colectivo: Recordemos ese día que Victor intentó cocinar y casi quemamos el discord. ¡Nunca olvidemos! (◣_◢)",
  ],

  // Jueves
  [
    "Jueves de maltratar a Víctor: Reparto de ladrillos y pipebombs en la entrada. (*≧ω≦)",
    "Jueves Purga de barcelonenses: ¡Hora de sacar el hacha y limpiar la ciudad! Recuerda, no valenciano. (╬ಠ益ಠ)",
    "Jueves de Overwatch: ¿Otra vez jugando support? ¡Deja de salvar a esos inútiles y ponte a hacer daño! (ง'̀-'́)ง",
  ],

  // Viernes
  [
    "Viernes de Adicción: ¿Crees que 12 latas son mucho? ¡Sobredosis o Valhalla! Nyaaa~",
    "Viernes de Peli: Hora de ver otro refrito koreano sobre artes marciales. (≧◡≦)",
  ],

  // Sábado
  [
    "Sábado de Tocar Hierba: ¡Sal de tu cueva! ¡El sol es tu enemigo, pero tocar hierba es tu misión! (•ω•)",
    "Sábado de Siesta Extrema: ¿Dormir 3 horas? ¡Eso es para principiantes! ¡A dormir todo el día! (－.－) zzZ",
    "Sábado de Maratón de Series: ¿Otra vez viendo la misma serie? ¡Al menos cambia de género! (≧∇≦)ﾉ",
  ],
];

const WEATHER_DESCRIPTIONS: { [key: number]: string } = {
  0: "Cielo despejado ☀️",
  1: "Mayormente despejado 🌤",
  2: "Parcialmente nublado ⛅",
  3: "Nublado ☁️",
  45: "Niebla 🌫",
  48: "Niebla con escarcha ❄️",
  51: "Llovizna ligera 🌦",
  53: "Llovizna moderada 💧",
  55: "Llovizna densa 🌧",
  61: "Lluvia ligera 🌧",
  63: "Lluvia moderada 💦",
  65: "Lluvia intensa 🌊",
  80: "Chubascos ligeros 💧",
  81: "Chubascos moderados 💦",
  82: "Chubascos violentos ⛈",
  95: "Tormenta eléctrica ⚡",
  96: "Tormenta con granizo ligero 🌩",
  99: "Tormenta con granizo intenso 🧊",
};
