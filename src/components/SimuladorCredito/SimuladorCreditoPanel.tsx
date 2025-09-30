import React, { useState } from 'react';
import { 
  CreditCard, 
  Calculator, 
  DollarSign,
  Calendar,
  Percent,
  FileText,
  Send,
  AlertCircle
} from 'lucide-react';

export default function SimuladorCreditoPanel() {
  const [valor, setValor] = useState(50000);
  const [finalidade, setFinalidade] = useState('custeio');
  const [prazo, setPrazo] = useState(12);
  const [mostrarSimulacao, setMostrarSimulacao] = useState(false);

  const taxas = {
    custeio: 8.5,
    investimento: 7.2,
    comercializacao: 6.8
  };

  const taxaAtual = taxas[finalidade as keyof typeof taxas];
  const taxaMensal = taxaAtual / 12 / 100;
  const parcela = valor * (taxaMensal * Math.pow(1 + taxaMensal, prazo)) / (Math.pow(1 + taxaMensal, prazo) - 1);
  const totalPagar = parcela * prazo;
  const totalJuros = totalPagar - valor;

  const handleSimular = () => {
    setMostrarSimulacao(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#092f20]">Simulador de Crédito Rural</h2>
          <div className="flex items-center space-x-2 text-[#397738]">
            <CreditCard className="w-5 h-5" />
            <span className="text-sm font-medium">Crédito Rural</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-[#86b646]" />
              <span className="text-sm font-medium text-[#092f20]">Custeio</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">8,5%</p>
            <p className="text-sm text-[#86b646]">ao ano</p>
          </div>
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#397738]" />
              <span className="text-sm font-medium text-[#092f20]">Investimento</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">7,2%</p>
            <p className="text-sm text-[#397738]">ao ano</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-sm font-medium text-[#092f20]">Comercialização</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">6,8%</p>
            <p className="text-sm text-[#8fa49d]">ao ano</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#092f20] mb-4">Dados da Simulação</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Solicitado (R$)
              </label>
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                placeholder="50.000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Finalidade
              </label>
              <select
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
              >
                <option value="custeio">Custeio da Lavoura</option>
                <option value="investimento">Investimento</option>
                <option value="comercializacao">Comercialização</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo (meses)
              </label>
              <select
                value={prazo}
                onChange={(e) => setPrazo(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
              >
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={18}>18 meses</option>
                <option value={24}>24 meses</option>
                <option value={36}>36 meses</option>
              </select>
            </div>
            
            <button
              onClick={handleSimular}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Simular</span>
            </button>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#092f20] mb-4">Resultado da Simulação</h3>
          
          {mostrarSimulacao ? (
            <div className="space-y-4">
              <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Valor Solicitado</span>
                  <span className="font-semibold text-[#092f20]">R$ {valor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Taxa de Juros</span>
                  <span className="font-semibold text-[#86b646]">{taxaAtual}% ao ano</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Prazo</span>
                  <span className="font-semibold text-[#092f20]">{prazo} meses</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900">Valor da Parcela</span>
                  <span className="text-xl font-bold text-[#86b646]">R$ {parcela.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900">Total a Pagar</span>
                  <span className="text-lg font-semibold text-[#092f20]">R$ {totalPagar.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900">Total de Juros</span>
                  <span className="text-lg font-semibold text-[#8fa49d]">R$ {totalJuros.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div className="bg-[#397738]/10 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Percent className="w-5 h-5 text-[#397738]" />
                  <span className="font-medium text-[#092f20]">CET (Custo Efetivo Total)</span>
                </div>
                <p className="text-2xl font-bold text-[#092f20]">
                  {((totalJuros / valor) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Preencha os dados e clique em "Simular" para ver o resultado</p>
            </div>
          )}
        </div>
      </div>

      {/* Solicitar Crédito */}
      {mostrarSimulacao && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Solicitar Crédito</h3>
              <p className="text-sm text-gray-600">Encaminhe sua solicitação para análise</p>
            </div>
            <button className="flex items-center space-x-2 px-6 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors">
              <Send className="w-4 h-4" />
              <span>Solicitar Crédito</span>
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-[#86b646]/10 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-[#86b646]" />
              <span className="text-sm font-medium text-[#092f20]">Documentos Necessários</span>
            </div>
            <ul className="text-sm text-[#397738] mt-2 space-y-1">
              <li>• CPF e RG do produtor</li>
              <li>• Comprovante de residência</li>
              <li>• Declaração do ITR dos últimos 3 anos</li>
              <li>• Comprovante de renda</li>
              <li>• Projeto técnico (para investimento)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}