import React, { useState } from 'react';
import { 
  Coffee, 
  TrendingUp, 
  Calculator, 
  DollarSign,
  Package,
  Check,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function SimuladorVendaPanel() {
  const [sacas, setSacas] = useState(200);
  const [tipoQualidade, setTipoQualidade] = useState('comercial');
  const [entrega, setEntrega] = useState('fazenda');

  const cotacoes = {
    comercial: 1726, // ← AQUI: Mesmo objeto de cotações
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#092f20]">Simulador de Venda</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulação */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#092f20] mb-4">Simular Venda</h3>
          
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#092f20] mb-4">Resultado da Simulação</h3>
          
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#092f20]">Fechar Venda</h3>
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
            A cotação é válida até 17:00 hoje. Após fechar a venda, você receberá a confirmação via WhatsApp do Zé.
          </p>
        </div>
      </div>
    </div>
  );
}