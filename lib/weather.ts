import { format, parseISO } from 'date-fns';

// Arlington, TX
const LAT = 32.7357;
const LON = -97.1081;

const WMO: Record<number, { desc: string; emoji: string }> = {
  0: { desc: 'Clear sky', emoji: '☀️' },
  1: { desc: 'Mainly clear', emoji: '🌤️' },
  2: { desc: 'Partly cloudy', emoji: '⛅' },
  3: { desc: 'Overcast', emoji: '☁️' },
  45: { desc: 'Foggy', emoji: '🌫️' },
  48: { desc: 'Icy fog', emoji: '🌫️' },
  51: { desc: 'Light drizzle', emoji: '🌦️' },
  53: { desc: 'Drizzle', emoji: '🌦️' },
  55: { desc: 'Heavy drizzle', emoji: '🌧️' },
  61: { desc: 'Light rain', emoji: '🌧️' },
  63: { desc: 'Rain', emoji: '🌧️' },
  65: { desc: 'Heavy rain', emoji: '🌧️' },
  71: { desc: 'Light snow', emoji: '🌨️' },
  73: { desc: 'Snow', emoji: '❄️' },
  75: { desc: 'Heavy snow', emoji: '❄️' },
  80: { desc: 'Showers', emoji: '🌦️' },
  81: { desc: 'Heavy showers', emoji: '🌧️' },
  82: { desc: 'Violent showers', emoji: '⛈️' },
  85: { desc: 'Snow showers', emoji: '🌨️' },
  86: { desc: 'Heavy snow showers', emoji: '🌨️' },
  95: { desc: 'Thunderstorm', emoji: '⛈️' },
  96: { desc: 'Thunderstorm', emoji: '⛈️' },
  99: { desc: 'Thunderstorm w/ hail', emoji: '⛈️' },
};

function wmo(code: number): { desc: string; emoji: string } {
  return WMO[code] ?? { desc: 'Unknown', emoji: '🌡️' };
}

export function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

export interface WeatherNow {
  temp: number;
  description: string;
  emoji: string;
  willRain: boolean;
  rainChance: number;
}

export interface WeatherDay {
  date: string; // "EEE MMM d"
  high: number;
  low: number;
  description: string;
  emoji: string;
  rainChance: number;
}

export interface WeatherData {
  current: WeatherNow;
  week: WeatherDay[];
}

export async function getWeather(): Promise<WeatherData | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(LAT));
    url.searchParams.set('longitude', String(LON));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone', 'America/Chicago');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json() as {
      current: { temperature_2m: number; weather_code: number };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
      };
    };

    const todayCode = data.daily.weather_code[0];
    const todayRain = data.daily.precipitation_probability_max[0] ?? 0;
    const cur = wmo(data.current.weather_code);

    return {
      current: {
        temp: Math.round(data.current.temperature_2m),
        description: cur.desc,
        emoji: cur.emoji,
        willRain: isRainCode(todayCode) || todayRain >= 50,
        rainChance: todayRain,
      },
      week: data.daily.time.map((dateStr, i) => {
        const info = wmo(data.daily.weather_code[i]);
        return {
          date: format(parseISO(dateStr), 'EEE MMM d'),
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          description: info.desc,
          emoji: info.emoji,
          rainChance: data.daily.precipitation_probability_max[i] ?? 0,
        };
      }),
    };
  } catch {
    return null;
  }
}
