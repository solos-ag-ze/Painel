import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Wind, 
  Droplets, 
  Thermometer,
  Eye,
  Gauge,
  AlertTriangle,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { WeatherService, WeatherData, WeatherForecast, WeatherAlert } from '../../services/weatherService';

interface WeatherWidgetProps {
  city?: string;
  state?: string;
}

export default function WeatherWidget({ city, state }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (city) {
      loadWeatherData();
    } else {
      setLoading(false);
    }
  }, [city, state]);


const loadWeatherData = async () => {
  if (!city) return;

  try {
    setLoading(true);
    setError(null);
    
    const [currentWeather, weatherForecast] = await Promise.all([
      WeatherService.getCurrentWeather(city, state),
      WeatherService.getWeatherForecast(city, state)
    ]);

    if (!currentWeather) {
      setError('Não foi possível obter dados meteorológicos');
      return;
    }

    setWeather(currentWeather);
    setForecast(weatherForecast);
    setAlerts(WeatherService.generateWeatherAlerts(currentWeather, weatherForecast));
    setLastUpdate(new Date());
    
  } catch (error) {
    console.error('Error loading weather data:', error);
    setError(error instanceof Error ? error.message : 'Erro ao carregar dados meteorológicos');
  } finally {
    setLoading(false);
  }
};


  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-[#86b646]/10 border-[#86b646]/30 text-[#86b646]';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getWeatherIconComponent = (iconCode: string) => {
    if (iconCode.includes('01')) return <Sun className="w-6 h-6 text-[#86b646]" />;
    if (iconCode.includes('02') || iconCode.includes('03')) return <Cloud className="w-6 h-6 text-gray-600" />;
    if (iconCode.includes('09') || iconCode.includes('10')) return <CloudRain className="w-6 h-6 text-[#397738]" />;
    return <Sun className="w-6 h-6 text-[#86b646]" />;
  };

  if (!city) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#092f20]">Clima e Alertas</h3>
          <MapPin className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Cidade não informada</p>
          <p className="text-sm text-gray-500 mt-1">
            Adicione sua cidade no perfil para ver informações meteorológicas
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#092f20]">Clima e Alertas</h3>
          <RefreshCw className="w-5 h-5 text-[#397738] animate-spin" />
        </div>
        
        <div className="text-center py-8">
          <RefreshCw className="w-12 h-12 text-[#397738] mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Carregando dados meteorológicos...</p>
          <p className="text-sm text-gray-500 mt-1">Conectando com OpenWeatherMap</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#092f20]">Clima e Alertas</h3>
          <button 
            onClick={loadWeatherData}
            className="p-1 text-[#397738] hover:bg-[#397738]/10 rounded-lg transition-colors"
            title="Tentar novamente"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-[#86b646] mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-1">
            Verifique sua conexão e tente novamente
          </p>
          <button 
            onClick={loadWeatherData}
            className="mt-3 px-4 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-[#092f20]">Clima e Alertas</h3>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{weather.cityName}</span>
          </div>
        </div>
        <button 
          onClick={loadWeatherData}
          className="p-1 text-[#397738] hover:bg-[#397738]/10 rounded-lg transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Clima Atual */}
      <div className="bg-[#86b646]/10 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getWeatherIconComponent(weather.icon)}
            <div>
              <p className="text-2xl font-bold text-[#092f20]">
                {WeatherService.formatTemperature(weather.temperature)}
              </p>
              <p className="text-sm text-[#397738] capitalize">{weather.description}</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Sensação: {WeatherService.formatTemperature(weather.feelsLike)}</p>
            <p>Umidade: {weather.humidity}%</p>
          </div>
        </div>

        {/* Detalhes do clima */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Wind className="w-4 h-4 text-[#397738]" />
            <span>{weather.windSpeed.toFixed(1)} m/s</span>
          </div>
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-[#8fa49d]" />
            <span>{weather.pressure} hPa</span>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span>{weather.visibility} km</span>
          </div>
          <div className="flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-[#86b646]" />
            <span>{weather.humidity}%</span>
          </div>
        </div>
      </div>

      {/* Previsão dos próximos dias */}
      {forecast.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-[#092f20] mb-3">Previsão dos Próximos Dias</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {forecast
  .filter((day) => {
    // Parse the date string properly in local time
    const [year, month, dayNum] = day.date.split('-').map(Number);
    const forecastDate = new Date(year, month - 1, dayNum);
    
    // Create today's date for comparison
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Exclude today - only show future days
    return forecastDate.getTime() !== todayDate.getTime();
  })
  .map((day, index) => {
    // Parse the date string properly in local time
    const [year, month, dayNum] = day.date.split('-').map(Number);
    const forecastDate = new Date(year, month - 1, dayNum);
    
    const dayName = forecastDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    
    return (
      <div key={index} className="text-center p-3 rounded-lg border-2 transition-all hover:shadow-md bg-gray-50 border-gray-200 hover:bg-gray-100">
        <p className="text-xs text-gray-600 mb-1">
          {dayName}
        </p>
        <p className="text-xs text-gray-500 mb-2">
          {forecastDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </p>
        <div className="text-xl mb-2">
          {WeatherService.getWeatherIcon(day.icon)}
        </div>
        <div className="text-xs mb-2">
          <p className="font-medium text-[#092f20]">
            {day.temperature.max}°
          </p>
          <p className="text-gray-500">
            {day.temperature.min}°
          </p>
        </div>
        <p className="text-xs text-gray-600 mb-1 capitalize leading-tight">
          {day.description}
        </p>
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Droplets className="w-3 h-3" />
            <span>{day.humidity}%</span>
          </div>
        </div>
        {day.precipitation > 0 && (
          <p className="text-xs text-[#397738] mt-1 font-medium">
            🌧️ {day.precipitation}mm
          </p>
        )}
      </div>
    );
  })}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#092f20]">Alertas Técnicos</h4>
          {alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}>
              <div className="flex items-start space-x-3">
                <span className="text-lg">{alert.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-sm mt-1">{alert.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Última atualização */}
      {lastUpdate && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      )}
    </div>
  );
}