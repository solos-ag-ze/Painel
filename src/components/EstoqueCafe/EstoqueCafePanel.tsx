import React, { useState } from 'react';
import { 
  Coffee, 
  Package, 
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Edit,
  Info
} from 'lucide-react';

export default function EstoqueCafePanel() {
  const [showNovoLoteForm, setShowNovoLoteForm] = useState(false);

  const estoqueCafe = [
    {
      id: 1,
      volume: 450,
      tipo: 'Arábica Tipo 6',
      armazem: 'Armazém Principal',
      dataEntrada: '2024-05-15',
      precoDesejado: 1750,
      status: 'Disponível',
      observacoes: 'Café de primeira qualidade, secagem no terreiro'
    },
    {
      id: 2,
      volume: 280,
      tipo: 'Cereja Descascado',
      armazem: 'Armazém Secundário',
      dataEntrada: '2024-05-20',
      precoDesejado: 1850,
      status: 'Disponível',
      observacoes: 'Processamento via úmida, excelente qualidade'
    },
    {
      id: 3,
      volume: 150,
      tipo: 'Arábica Tipo 6/7',
      armazem: 'Armazém Principal',
      dataEntrada: '2024-05-10',
      precoDesejado: 1720,
      status: 'Reservado',
      observacoes: 'Reservado para cliente especial'
    },
    {
      id: 4,
      volume: 320,
      tipo: 'Arábica Tipo 6',
      armazem: 'Silo 1',
      dataEntrada: '2024-05-25',
      precoDesejado: 1780,
      status: 'Disponível',
      observacoes: 'Lote homogêneo, boa classificação'
    },
    {
      id: 5,
      volume: 200,
      tipo: 'Cereja Descascado',
      armazem: 'Armazém Secundário',
      dataEntrada: '2024-04-30',
      precoDesejado: 1900,
      status: 'Vendido',
      observacoes: 'Vendido para exportação - lote premium'
    },
    {
      id: 6,
      volume: 180,
      tipo: 'Arábica Tipo 6/7',
      armazem: 'Silo 2',
      dataEntrada: '2024-05-18',
      precoDesejado: 1700,
      status: 'Disponível',
      observacoes: 'Secagem artificial, boa conservação'
    }
  ];


  const totalSacas = estoqueCafe.reduce((acc, item) => acc + item.volume, 0);
  const sacasDisponiveis = estoqueCafe
    .filter(item => item.status === 'Disponível')
    .reduce((acc, item) => acc + item.volume, 0);
  const sacasReservadas = estoqueCafe
    .filter(item => item.status === 'Reservado')
    .reduce((acc, item) => acc + item.volume, 0);
  const sacasVendidas = estoqueCafe
    .filter(item => item.status === 'Vendido')
    .reduce((acc, item) => acc + item.volume, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return 'bg-[#397738]/20 text-[#397738] border-[#397738]/30';
      case 'Vendido': return 'bg-[#8fa49d]/20 text-[#8fa49d] border-[#8fa49d]/30';
      case 'Reservado': return 'bg-[#86b646]/20 text-[#86b646] border-[#86b646]/30';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Disponível': return <CheckCircle className="w-4 h-4 text-[#397738]" />;
      case 'Vendido': return <Package className="w-4 h-4 text-[#8fa49d]" />;
      case 'Reservado': return <Clock className="w-4 h-4 text-[#86b646]" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const dataAtualizacao = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        {/* Nota PRO */}
        <div className="bg-[#86b646]/10 border border-[#86b646]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#86b646] rounded-full"></div>
            <span className="text-sm font-medium text-[#092f20]">Lotes Demonstrativos</span>
          </div>
          <p className="text-sm text-[#397738] mt-1">
            Os lotes de café apresentados são exemplos. No plano PRO, você poderá cadastrar 
            e gerenciar os lotes reais da sua fazenda com controle completo de armazenamento.
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Estoque de Café</h2>
              <p className="text-sm text-gray-600">Controle de armazenamento e comercialização</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#397738]">Lotes cadastrados via WhatsApp</p>
            <p className="text-xs text-gray-500">Controle automático de armazenamento</p>
          </div>
        </div>

        {/* Informações de atualização */}
        <div className="bg-[#8fa49d]/10 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-sm font-medium text-[#092f20]">
                Estoque atualizado até: {dataAtualizacao}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#397738]">
                Você ainda tem <span className="font-bold">{sacasDisponiveis}</span> sacas disponíveis para comercialização
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-[#86b646]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Total Sacas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{totalSacas.toLocaleString()}</p>
          </div>
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-[#397738]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Disponíveis</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{sacasDisponiveis.toLocaleString()}</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Reservadas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{sacasReservadas.toLocaleString()}</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Vendidas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{sacasVendidas.toLocaleString()}</p>
          </div>
        </div>
      </div>


      {/* Cartões dos Lotes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#092f20]">Lotes em Estoque</h3>
          <p className="text-sm text-gray-600">
            {estoqueCafe.length} {estoqueCafe.length === 1 ? 'lote encontrado' : 'lotes encontrados'}
          </p>
        </div>

        <div className="space-y-4">
          {estoqueCafe.map((lote) => (
            <div key={lote.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Informações principais */}
                <div className="flex items-center space-x-6">
                  {/* Volume */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#092f20]">{lote.volume}</p>
                      <p className="text-sm text-gray-500">sacas 60kg</p>
                    </div>
                  </div>

                  {/* Tipo e Local */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-[#092f20] mb-1">{lote.tipo}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-[#8fa49d]" />
                        <span>{lote.armazem}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Entrada: {new Date(lote.dataEntrada).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preço Desejado */}
                  <div className="text-center">
                    <div className="flex items-center space-x-1 justify-center mb-1">
                      <DollarSign className="w-4 h-4 text-[#397738]" />
                      <span className="text-sm text-gray-600">Preço Desejado</span>
                    </div>
                    <p className="text-lg font-bold text-[#397738]">
                      R$ {lote.precoDesejado.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">por saca</p>
                  </div>
                </div>

                {/* Status e Ações */}
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {getStatusIcon(lote.status)}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(lote.status)}`}>
                        {lote.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-[#397738] hover:bg-[#397738]/10 rounded-lg transition-colors" title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-[#86b646] hover:bg-[#86b646]/10 rounded-lg transition-colors" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {lote.observacoes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-[#8fa49d] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-[#092f20]">Observações:</span>
                      <p className="text-sm text-[#397738] mt-1">{lote.observacoes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}