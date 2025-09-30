import React, { useState } from 'react';
import { 
  Coffee, 
  TrendingUp, 
  Calculator, 
  DollarSign,
  Package,
  Check,
  ArrowRight,
  AlertCircle,
  Calendar,
  BarChart3,
  MessageSquare
} from 'lucide-react';

export default function VendasPanel() {
  const [sacas, setSacas] = useState(200);
  const [tipoQualidade, setTipoQualidade] = useState('comercial');
  const [entrega, setEntrega] = useState('fazenda');

  const cotacoes = {
    comercial: 1726,
    especial: 1714,
    premium: 1823
  };

  const custoProducao = {
    comercial: 920,
    especial: 1120,
    premium: 1320
  };

  const cotacaoAtual = cotacoes[tipoQualidade as keyof typeof cotacoes];
  const custoAtual = custoProducao[tipoQualidade as keyof typeof custoProducao];
  const lucroSaca = cotacaoAtual - custoAtual;
  const lucroTotal = lucroSaca * sacas;
  const receitaTotal = cotacaoAtual * sacas;

  // Dados do histórico de simulações (mockados)
  const historicoSimulacoes = [
    {
      id: 1,
      data: '2024-01-15',
      produto: 'Café Arábica Tipo 6',
      quantidade: 200,
      unidade: 'sacas',
      cotacao: 1726,
      receitaEstimada: 345200,
      observacoes: 'Simulação para venda imediata'
    },
    {
      id: 2,
      data: '2024-01-12',
      produto: 'Café Cereja Descascado',
      quantidade: 150,
      unidade: 'sacas',
      cotacao: 1823,
      receitaEstimada: 273450,
      observacoes: 'Café especial - mercado premium'
    },
    {
      id: 3,
      data: '2024-01-10',
      produto: 'Café Arábica Tipo 6/7',
      quantidade: 300,
      unidade: 'sacas',
      cotacao: 1714,
      receitaEstimada: 514200,
      observacoes: 'Simulação para entrega futura'
    },
    {
      id: 4,
      data: '2024-01-08',
      produto: 'Café Arábica Tipo 6',
      quantidade: 180,
      unidade: 'sacas',
      cotacao: 1720,
      receitaEstimada: 309600,
      observacoes: 'Teste de cotação'
    },
    {
      id: 5,
      data: '2024-01-05',
      produto: 'Café Cereja Descascado',
      quantidade: 120,
      unidade: 'sacas',
      cotacao: 1810,
      receitaEstimada: 217200,
      observacoes: 'Simulação para cliente específico'
    },
    {
      id: 6,
      data: '2024-01-03',
      produto: 'Café Arábica Tipo 6',
      quantidade: 250,
      unidade: 'sacas',
      cotacao: 1715,
      receitaEstimada: 428750,
      observacoes: 'Análise de mercado'
    }
  ];

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getProductIcon = (produto: string) => {
    if (produto.includes('Cereja')) {
      return <Coffee className="w-5 h-5 text-[#86b646]" />;
    }
    return <Coffee className="w-5 h-5 text-[#397738]" />;
  };

  const getProductColor = (produto: string) => {
    if (produto.includes('Cereja')) {
      return 'bg-[#86b646]/10 border-[#86b646]/30';
    }
    return 'bg-[#397738]/10 border-[#397738]/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Nota PRO */}
        <div className="bg-[#86b646]/10 border border-[#86b646]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#86b646] rounded-full"></div>
            <span className="text-sm font-medium text-[#092f20]">Simulações Demonstrativas</span>
          </div>
          <p className="text-sm text-[#397738] mt-1">
            As cotações e simulações apresentadas são exemplos. No plano PRO, você terá acesso a 
            cotações em tempo real e poderá realizar vendas reais através da plataforma.
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Vendas</h2>
              <p className="text-sm text-gray-600">Simulador e histórico de vendas</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[#397738]">
            <div className="w-2 h-2 bg-[#397738] rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Cotação atualizada</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-[#86b646]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Café Arábica (Tipo 6 Bebida Dura Bica Corrida)</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">R$ 1.726</p>
            <p className="text-sm text-[#86b646]">+2.5% vs ontem</p>
          </div>
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#397738]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Café Arábica (Tipo 6/7 Bebida Dura Bica Corrida)</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">R$ 1.714</p>
            <p className="text-sm text-[#397738]">+1.8% vs ontem</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Café Cereja Descascado</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">R$ 1.823</p>
            <p className="text-sm text-[#8fa49d]">+3.2% vs ontem</p>
          </div>
        </div>
      </div>

      {/* Simulador de Venda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[#092f20]">Simulador de Venda</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulação */}
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade de Sacas
                </label>
                <input
                  type="number"
                  value={sacas}
                  onChange={(e) => setSacas(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                  placeholder="200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Café
                </label>
                <select
                  value={tipoQualidade}
                  onChange={(e) => setTipoQualidade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                >
                  <option value="comercial">Café Arábica (Tipo 6 Bebida Dura Bica Corrida)</option>
                  <option value="especial">Café Arábica (Tipo 6/7 Bebida Dura Bica Corrida)</option>
                  <option value="premium">Café Cereja Descascado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Local de Entrega
                </label>
                <select
                  value={entrega}
                  onChange={(e) => setEntrega(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                >
                  <option value="fazenda">Retirada na Fazenda</option>
                  <option value="cooxupe">Entrega na Cooxupé</option>
                  <option value="posto">Posto de Recebimento</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div>
            <div className="space-y-4">
              <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Cotação por Saca</span>
                  <span className="font-semibold text-[#092f20]">R$ {cotacaoAtual.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Custo de Produção</span>
                  <span className="font-semibold text-red-600">R$ {custoAtual.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lucro por Saca</span>
                  <span className="font-semibold text-[#397738]">R$ {lucroSaca.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900">Receita Total</span>
                  <span className="text-xl font-bold text-[#86b646]">R$ {receitaTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900">Lucro Total</span>
                  <span className="text-xl font-bold text-[#397738]">R$ {lucroTotal.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-[#397738]/10 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="w-5 h-5 text-[#397738]" />
                  <span className="font-medium text-[#092f20]">Margem de Lucro</span>
                </div>
                <p className="text-2xl font-bold text-[#092f20]">
                  {((lucroSaca / cotacaoAtual) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[#092f20]">Fechar Venda</h4>
              <p className="text-sm text-gray-600">Confirme os dados e efetue a venda</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Salvar Simulação
              </button>
              <button className="flex items-center space-x-2 px-6 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors">
                <Check className="w-4 h-4" />
                <span>Fechar Venda</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-[#86b646]/10 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-[#86b646]" />
              <span className="text-sm font-medium text-[#092f20]">Informação Importante</span>
            </div>
            <p className="text-sm text-[#397738] mt-1">
              A cotação é válida até 17:00 hoje. Após fechar a venda, você receberá a confirmação via WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Histórico de Simulações */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#8fa49d] to-[#397738] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Histórico de Simulações</h3>
              <p className="text-sm text-gray-600">Simulações realizadas via WhatsApp do ZÉ DA SAFRA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#397738]">{historicoSimulacoes.length} simulações</p>
            <p className="text-xs text-gray-500">Últimos 30 dias</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {historicoSimulacoes.map((simulacao) => (
            <div 
              key={simulacao.id} 
              className={`p-4 rounded-lg border-2 ${getProductColor(simulacao.produto)} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getProductIcon(simulacao.produto)}
                  <span className="text-sm font-medium text-[#092f20]">
                    {formatarData(simulacao.data)}
                  </span>
                </div>
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>

              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-[#092f20] text-sm">{simulacao.produto}</h4>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Quantidade</span>
                  <span className="text-sm font-medium text-[#092f20]">
                    {simulacao.quantidade.toLocaleString()} {simulacao.unidade}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Cotação</span>
                  <span className="text-sm font-medium text-[#397738]">
                    R$ {simulacao.cotacao.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-600">Receita Estimada</span>
                  <span className="text-lg font-bold text-[#86b646]">
                    R$ {simulacao.receitaEstimada.toLocaleString()}
                  </span>
                </div>
              </div>

              {simulacao.observacoes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-[#397738]">{simulacao.observacoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Informação sobre WhatsApp */}
        <div className="mt-6 p-4 bg-[#8fa49d]/10 rounded-lg">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#8fa49d]" />
            <span className="text-sm font-medium text-[#092f20]">Como funciona</span>
          </div>
          <p className="text-sm text-[#397738] mt-1">
            As simulações são realizadas diretamente no WhatsApp do ZÉ DA SAFRA. 
            Aqui você visualiza o histórico de todas as simulações já feitas, organizadas por data.
          </p>
        </div>
      </div>
    </div>
  );
}