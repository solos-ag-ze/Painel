export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  feelsLike: number;
  visibility: number;
  uvIndex?: number;
  cityName: string;
  country: string;
  icon: string;
  timestamp: Date; // Added timestamp field
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  humidity: number;
  precipitation: number;
  icon: string;
}

export interface WeatherAlert {
  type: 'rain' | 'frost' | 'wind' | 'temperature' | 'humidity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  icon: string;
}

export class WeatherService {
  private static API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ;
  private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private static readonly CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  
  
  static async getCurrentWeather(city: string, state?: string, forceRefresh = false): Promise<WeatherData | null> {
  try {
    if (!this.API_KEY) {
      console.warn('OpenWeatherMap API key not configured - using mock data');
      return null; // ← Change this line
    }

    const query = state ? `${city},${state},BR` : `${city},BR`;
    const url = `${this.BASE_URL}/weather?q=${encodeURIComponent(query)}&appid=${this.API_KEY}&units=metric&lang=pt_br`;
    
    console.log('Fetching weather for:', query);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API error:', response.status, response.statusText);
      return null; // ← Change this line
    }

    const data = await response.json();
    console.log("🌍 Current Weather API response:", data);
    return this.transformCurrentWeatherData(data, city);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null; // ← Change this line
  }
}

  private static transformCurrentWeatherData(data: any, city: string): WeatherData {
    const now = new Date();

    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed || 0,
      pressure: data.main.pressure,
      feelsLike: Math.round(data.main.feels_like),
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 0,
      cityName: data.name || city,
      country: data.sys?.country || 'BR',
      icon: data.weather[0].icon,
      timestamp: now
    };
  }

static async getWeatherForecast(city: string, state?: string, forceRefresh = false): Promise<WeatherForecast[]> {
  try {
    if (!this.API_KEY) {
      console.warn('OpenWeatherMap API key not configured - using mock data');
      return []; // ← Change this line
    }

    const query = state ? `${city},${state},BR` : `${city},BR`;
    const url = `${this.BASE_URL}/forecast?q=${encodeURIComponent(query)}&appid=${this.API_KEY}&units=metric&lang=pt_br`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather forecast API error:', response.status, response.statusText);
      return []; // ← Change this line
    }

    const data = await response.json();
    console.log("📅 Forecast API response:", data);

    return this.transformForecastData(data);
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return []; // ← Change this line
  }
}

 private static transformForecastData(data: any): WeatherForecast[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  console.log("today", today);
  const dailyForecasts: { [key: string]: any[] } = {};
  
  // Step 1: Group 3-hour forecasts by date
  data.list.forEach((item: any) => {
    const utcTime = new Date(item.dt * 1000);
    const dateKey = utcTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = [];
    }
    dailyForecasts[dateKey].push(item);
  });

  // Step 2: Process each day and calculate aggregated data
  return Object.entries(dailyForecasts)
    .filter(([date]) => {
      const forecastDate = new Date(date + 'T00:00:00Z'); // Ensure UTC
      return forecastDate >= today; // Only include today and future dates
    })
    .slice(0, 7) // Limit to next 7 days including today
    .map(([date, forecasts]) => {
      
      // Step 3: Calculate temperature data (min/max from all 3-hour slots)
      const temps = forecasts.map(f => f.main.temp);
      const minTemp = Math.round(Math.min(...temps));
      const maxTemp = Math.round(Math.max(...temps));
      
      // Step 4: Calculate average humidity
      const humidities = forecasts.map(f => f.main.humidity);
      const avgHumidity = Math.round(humidities.reduce((sum, h) => sum + h, 0) / humidities.length);
      
      // Step 5: Calculate total precipitation
      // Check for rain and snow in the forecast data
      let totalPrecipitation = 0;
      forecasts.forEach(f => {
        // Add rain if present (3h accumulation)
        if (f.rain && f.rain['3h']) {
          totalPrecipitation += f.rain['3h'];
        }
        // Add snow if present (3h accumulation) 
        if (f.snow && f.snow['3h']) {
          totalPrecipitation += f.snow['3h'];
        }
      });
      totalPrecipitation = Math.round(totalPrecipitation * 10) / 10; // Round to 1 decimal
      
      // Step 6: Determine the most representative weather condition and icon
      const mostRepresentativeWeather = this.getMostRepresentativeWeather(forecasts);
      
      return {
        date,
        temperature: {
          min: minTemp,
          max: maxTemp
        },
        description: mostRepresentativeWeather.description,
        humidity: avgHumidity,
        precipitation: totalPrecipitation,
        icon: mostRepresentativeWeather.icon
      };
    });
}



private static getMostRepresentativeWeather(forecasts: any[]): { description: string; icon: string } {
  // Weather priority system - but we'll use this more intelligently
  const weatherPriority: { [key: string]: number } = {
    'Clear': 1,           // Clear sky
    'Clouds': 2,          // Cloudy (but we'll consider frequency)
    'Mist': 4, 'Fog': 4, 'Haze': 4, 'Dust': 4, 'Smoke': 4, // Atmospheric conditions
    'Drizzle': 5,         // Light rain
    'Rain': 6,            // Rain - always significant
    'Snow': 7,            // Snow - always significant
    'Thunderstorm': 8     // Storms - always most significant
  };
  
  // Count occurrences and find the highest priority weather condition
  const weatherCounts: { [key: string]: { count: number; samples: any[] } } = {};
  
  forecasts.forEach(forecast => {
    const weatherMain = forecast.weather[0].main;
    
    if (!weatherCounts[weatherMain]) {
      weatherCounts[weatherMain] = {
        count: 0,
        samples: []
      };
    }
    weatherCounts[weatherMain].count++;
    weatherCounts[weatherMain].samples.push(forecast.weather[0]);
  });
  
  console.log("📊 Weather counts:", weatherCounts);
  
  // Find the most significant weather condition using improved logic
  let mostSignificant = { 
    weather: 'Clear', 
    priority: 0, 
    count: 0,
    samples: [forecasts[0].weather[0]] // Fallback
  };
  
  Object.entries(weatherCounts).forEach(([weatherType, data]) => {
    const priority = weatherPriority[weatherType] || 1;
    const frequency = data.count / forecasts.length; // Percentage of the day
    
    console.log(`⚖️ ${weatherType}: priority ${priority}, count ${data.count}, frequency ${(frequency * 100).toFixed(1)}%`);
    
    // New improved logic:
    let shouldUpdate = false;
    
    // High priority weather (Rain, Snow, Thunderstorm) - always wins regardless of frequency
    if (priority >= 6) {
      shouldUpdate = priority > (weatherPriority[mostSignificant.weather] || 1);
    }
    // Medium priority weather (Clouds, Mist, etc.) - needs significant presence
    else if (priority >= 3 && priority <= 5) {
      const currentPriority = weatherPriority[mostSignificant.weather] || 1;
      
      // If current best is low priority (Clear) and this has decent frequency (>40%)
      if (currentPriority <= 2 && frequency >= 0.4) {
        shouldUpdate = true;
      }
      // If same priority level, prefer higher frequency
      else if (priority === currentPriority) {
        shouldUpdate = data.count > mostSignificant.count;
      }
      // If higher priority than current
      else if (priority > currentPriority) {
        shouldUpdate = true;
      }
    }
    // Low priority weather (Clear, light Clouds) - prefer higher frequency
    else {
      const currentPriority = weatherPriority[mostSignificant.weather] || 1;
      
      // Only update if current is also low priority and this has higher frequency
      if (currentPriority <= 2) {
        shouldUpdate = data.count > mostSignificant.count;
      }
    }
    
    if (shouldUpdate) {
      mostSignificant = {
        weather: weatherType,
        priority,
        count: data.count,
        samples: data.samples
      };
    }
  });
  
  // Choose the best icon from the samples (prefer daytime icons if available)
  const bestSample = this.chooseBestIcon(mostSignificant.samples);
  
  console.log(`🎯 Most significant weather: ${mostSignificant.weather} (${bestSample.description}) - Icon: ${bestSample.icon}`);
  
  return {
    description: bestSample.description,
    icon: bestSample.icon
  };
}

// Helper method to choose the best icon from multiple samples
private static chooseBestIcon(samples: any[]): any {
  // Prefer daytime icons (ending with 'd') over nighttime icons (ending with 'n')
  const daytimeSample = samples.find(sample => sample.icon.endsWith('d'));
  return daytimeSample || samples[0]; // Fallback to first sample if no daytime icon
}
 

  
  static generateWeatherAlerts(weather: WeatherData, forecast: WeatherForecast[]): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const now = new Date();

    // Current weather alerts
    if (weather.windSpeed > 10) {
      alerts.push({
        type: 'wind',
        severity: weather.windSpeed > 15 ? 'high' : 'medium',
        title: 'Vento Forte',
        description: `Ventos de ${weather.windSpeed.toFixed(1)} m/s - cuidado com pulverizações`,
        icon: '💨'
      });
    }

    if (weather.temperature > 35) {
      alerts.push({
        type: 'temperature',
        severity: weather.temperature > 40 ? 'high' : 'medium',
        title: 'Temperatura Elevada',
        description: `${weather.temperature}°C - evite atividades nas horas mais quentes`,
        icon: '🌡️'
      });
    }

    if (weather.humidity < 30) {
      alerts.push({
        type: 'humidity',
        severity: weather.humidity < 20 ? 'high' : 'medium',
        title: 'Umidade Baixa',
        description: `${weather.humidity}% - risco de incêndios e estresse hídrico`,
        icon: '🏜️'
      });
    }

    // Forecast alerts
    forecast.forEach(day => {
      const forecastDate = new Date(day.date);
      if (forecastDate < now) return; // Skip past dates

      const dateStr = forecastDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
      });

      // Rain alert
      if (day.precipitation > 0) {
        alerts.push({
          type: 'rain',
          severity: day.precipitation > 10 ? 'high' : 'medium',
          title: 'Previsão de Chuva',
          description: `${day.precipitation.toFixed(1)}mm esperados para ${dateStr}`,
          icon: '🌧️'
        });
      }

      // Frost alert
      if (day.temperature.min < 5) {
        alerts.push({
          type: 'frost',
          severity: day.temperature.min < 0 ? 'high' : 'medium',
          title: 'Risco de Geada',
          description: `Temperatura mínima de ${day.temperature.min}°C prevista para ${dateStr}`,
          icon: '❄️'
        });
      }
    });

    return alerts;
  }

  static getWeatherIcon(iconCode: string): string {
    const iconMap: Record<string, string> = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  }

  static formatTemperature(temp: number): string {
    return `${temp}°C`;
  }

  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  static isDataFresh(timestamp: Date): boolean {
    return (Date.now() - timestamp.getTime()) < this.CACHE_TIMEOUT;
  }
}