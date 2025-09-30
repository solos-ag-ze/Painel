import React, { useState } from 'react';
import { 
  Calendar, 
  User, 
  MapPin, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Eye,
  Coffee,
  Users,
  BookOpen,
  TestTube
} from 'lucide-react';

// Dados mockados dos eventos
const eventosData = [
  {
    id: 1,
    title: "Visita Técnica - João Agrônomo",
    date: "2025-01-15",
    time: "09:00",
    location: "Fazenda Bom Jardim - Guaxupé/MG",
    type: "Visita Técnica",
    technician: "João Silva",
    description: "Avaliação de pragas e doenças na lavoura"
  },
  {
    id: 2,
    title: "Dia de Campo: Nutrição do Café",
    date: "2025-01-18",
    time: "14:00",
    location: "Centro de Eventos, Muzambinho/MG",
    type: "Evento",
    technician: "Maria Santos",
    description: "Workshop sobre adubação e nutrição do cafeeiro"
  },
  {
    id: 3,
    title: "Análise de Solo",
    date: "2025-01-22",
    time: "08:00",
    location: "Fazenda Santa Rita - Alfenas/MG",
    type: "Visita Técnica",
    technician: "Carlos Oliveira",
    description: "Coleta de amostras para análise de solo"
  },
  {
    id: 4,
    title: "Treinamento: Manejo Integrado",
    date: "2025-01-25",
    time: "13:30",
    location: "Centro de Treinamento - Guaxupé/MG",
    type: "Treinamento",
    technician: "Ana Costa",
    description: "Curso sobre manejo integrado de pragas e doenças"
  },
  {
    id: 5,
    title: "Visita Técnica - Pós-colheita",
    date: "2025-01-28",
    time: "10:00",
    location: "Fazenda Esperança - Monte Belo/MG",
    type: "Visita Técnica",
    technician: "Pedro Almeida",
    description: "Orientações sobre secagem e armazenamento"
  },
  {
    id: 6,
    title: "Dia de Campo: Irrigação",
    date: "2025-02-05",
    time: "15:00",
    location: "Fazenda Modelo - São Sebastião do Paraíso/MG",
    type: "Evento",
    technician: "Roberto Lima",
    description: "Demonstração de sistemas de irrigação eficientes"
  }
];

export default function AgendaTecnicaPanel() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'Visita Técnica': return <User className="w-4 h-4 text-[#397738]" />;
      case 'Evento': return <Coffee className="w-4 h-4 text-[#86b646]" />;
      case 'Treinamento': return <BookOpen className="w-4 h-4 text-[#8fa49d]" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Visita Técnica': return 'bg-[#397738]/10 border-[#397738]/30 text-[#397738]';
      case 'Evento': return 'bg-[#86b646]/10 border-[#86b646]/30 text-[#86b646]';
      case 'Treinamento': return 'bg-[#8fa49d]/10 border-[#8fa49d]/30 text-[#8fa49d]';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    // Completar com dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return eventosData.filter(event => event.date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Agenda Técnica</h2>
              <p className="text-sm text-gray-600">Visitas técnicas e eventos</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-[#092f20] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendário
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-[#092f20] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Lista
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#397738]">Agenda Técnica Automática</p>
              <p className="text-xs text-gray-500">Baseada no calendário agrícola</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-[#397738]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Visitas Técnicas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">
              {eventosData.filter(e => e.type === 'Visita Técnica').length}
            </p>
          </div>
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-[#86b646]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Eventos</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">
              {eventosData.filter(e => e.type === 'Evento').length}
            </p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Treinamentos</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">
              {eventosData.filter(e => e.type === 'Treinamento').length}
            </p>
          </div>
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#397738]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Total Eventos</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">
              {eventosData.length}
            </p>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Visualização do Calendário */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cabeçalho do Calendário */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#092f20]">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm text-[#397738] hover:bg-[#397738]/10 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div className="p-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const events = getEventsForDate(day.date);
                const isCurrentDay = isToday(day.date);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors ${
                      !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    } ${isCurrentDay ? 'ring-2 ring-[#397738] bg-[#397738]/5' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-[#397738]' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {events.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getEventTypeColor(event.type)}`}
                        >
                          <div className="flex items-center space-x-1">
                            {getEventTypeIcon(event.type)}
                            <span className="truncate">{event.time}</span>
                          </div>
                          <div className="truncate font-medium mt-0.5">
                            {event.title.split(' - ')[0]}
                          </div>
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{events.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Visualização em Lista */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#092f20]">Próximos Eventos</h3>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          <div className="divide-y divide-gray-200">
            {eventosData.map(event => (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg border ${getEventTypeColor(event.type)}`}>
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#092f20] mb-1">{event.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{event.technician}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="p-2 text-[#397738] hover:bg-[#397738]/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#092f20]">Detalhes do Evento</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-[#092f20] mb-1">{selectedEvent.title}</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(selectedEvent.type)}`}>
                  {selectedEvent.type}
                </span>
              </div>
              
              <p className="text-sm text-gray-600">{selectedEvent.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(selectedEvent.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{selectedEvent.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{selectedEvent.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{selectedEvent.technician}</span>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                <button className="flex-1 px-4 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors">
                  Confirmar Presença
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}