import React, { useState } from 'react';
import { Info, Edit3, Plus, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function DREPanel() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Mock Data
  const mockDREData = {
    receitaTotal: 450000,
    despesasTotal: 280000,
    resultadoOperacional: 170000,
    completenessPercentage: 65,
    receitas: {
      receitasBrutas: 450000,
      deducoes: 0,
      receitaLiquida: 450000,
    },
    custosVariaveis: {
      insumosAgricolas: 45000,
      fertilizantes: 32000,
      defensivos: 18000,
      maoDeObraTemporaria: 28000,
      colheita: 52000,
      posColheita: 15000,
      frete: 22000,
      outrosCustosVariaveis: 8000,
    },
    margem: 230000,
    custosFixos: {
      maoDeObraFixa: 18000,
      encargosTrabalistas: 5400,
      energiaEletrica: 3200,
      administracao: 4800,
      manutencao: 8600,
      despesasGerais: 2000,
    },
    depreciacaoAmortizacao: {
      depreciacaoMaquinas: 0,
      depreciacaoBenfeitorias: 0,
      amortizacoes: 0,
    },
    impostos: {
      icms: 0,
      funrural: 0,
      iss: 0,
      outrosTributos: 0,
    },
    ebitda: 170000,
  };

  const custoVariavelTotal = Object.values(mockDREData.custosVariaveis).reduce((a, b) => a + b, 0);
  const custoFixoTotal = Object.values(mockDREData.custosFixos).reduce((a, b) => a + b, 0);
  const depreciacaoTotal = Object.values(mockDREData.depreciacaoAmortizacao).reduce((a, b) => a + b, 0);
  const impostosTotal = Object.values(mockDREData.impostos).reduce((a, b) => a + b, 0);
  const resultadoLiquido = mockDREData.ebitda - depreciacaoTotal - impostosTotal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const StatsCard = ({ title, value, subtitle, status }: { title: string; value: string; subtitle: string; status?: 'positive' | 'negative' | 'neutral' }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p
        className={`text-2xl font-bold mb-2 ${
          status === 'positive' ? 'text-green-600' : status === 'negative' ? 'text-orange-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );

  const DRELineItem = ({ label, value, tooltip, canEdit, icon }: { label: string; value: string | number; tooltip?: string; canEdit?: boolean; icon?: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {icon}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 min-w-32 text-right">{typeof value === 'number' ? formatCurrency(value) : value}</p>
        {tooltip && (
          <div className="group relative cursor-help">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            <div className="invisible group-hover:visible absolute z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded bottom-full right-0 mb-2 tooltip-arrow">
              {tooltip}
            </div>
          </div>
        )}
        {canEdit && <Edit3 className="w-4 h-4 text-gray-300 hover:text-gray-600 cursor-pointer" />}
      </div>
    </div>
  );

  const DRESection = ({ title, color, children }: { title: string; color: 'green' | 'orange' | 'gray'; children: React.ReactNode }) => {
    const colorMap = {
      green: 'bg-green-50 border-l-4 border-green-600',
      orange: 'bg-orange-50 border-l-4 border-orange-500',
      gray: 'bg-gray-50 border-l-4 border-gray-300',
    };

    return (
      <div className={`${colorMap[color]} p-4 rounded-lg mb-6`}>
        <h4 className="font-bold text-gray-900 mb-4 text-sm">{title}</h4>
        <div>{children}</div>
      </div>
    );
  };

  const ActionCard = ({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left w-full"
    >
      <div className="text-green-600 mt-1">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* ===== SEÇÃO 1: RESUMO EXECUTIVO ===== */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Resultados da Operação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Receita Total"
            value={formatCurrency(mockDREData.receitaTotal)}
            subtitle="Soma das receitas registradas"
          />
          <StatsCard
            title="Despesas Totais"
            value={formatCurrency(mockDREData.despesasTotal)}
            subtitle="Soma de todos os pagamentos"
          />
          <StatsCard
            title="Resultado Operacional"
            value={formatCurrency(mockDREData.resultadoOperacional)}
            subtitle="Resultado disponível até agora"
            status="positive"
          />
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Nível de Completeness</h3>
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[#86b646] to-[#397738] h-2 rounded-full transition-all"
                  style={{ width: `${mockDREData.completenessPercentage}%` }}
                ></div>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{mockDREData.completenessPercentage}%</p>
            <p className="text-xs text-gray-500">dos dados completos</p>
          </div>
        </div>
      </div>

      {/* ===== SEÇÃO 2: DEMONSTRATIVO DE RESULTADOS ===== */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Demonstrativo de Resultados (DRE)</h3>

        {/* BLOCO A - RECEITAS */}
        <DRESection title="BLOCO A — RECEITAS" color="green">
          <DRELineItem
            label="Receitas Brutas"
            value={mockDREData.receitas.receitasBrutas}
            tooltip="Receitas registradas via pagamentos, documentos ou notas fiscais"
          />
          <DRELineItem
            label="(-) Deduções e Impostos sobre Receita"
            value="—"
            tooltip="Preenchido automaticamente via XML de NF ou integração fiscal"
          />
          <DRELineItem
            label="Receita Líquida"
            value={mockDREData.receitas.receitaLiquida}
            tooltip="Receita líquida será exibida quando houver dados fiscais suficientes"
          />
        </DRESection>

        {/* BLOCO B - CUSTOS VARIÁVEIS */}
        <DRESection title="BLOCO B — CUSTOS VARIÁVEIS" color="orange">
          <DRELineItem
            label="Insumos Agrícolas"
            value={mockDREData.custosVariaveis.insumosAgricolas}
            tooltip="Calculado a partir de lançamentos financeiros e notas fiscais"
          />
          <DRELineItem
            label="Fertilizantes"
            value={mockDREData.custosVariaveis.fertilizantes}
            tooltip="Lançamentos de despesas com fertilizantes"
          />
          <DRELineItem
            label="Defensivos"
            value={mockDREData.custosVariaveis.defensivos}
            tooltip="Custos com agroquímicos e defensivos agrícolas"
          />
          <DRELineItem
            label="Mão de Obra Temporária"
            value={mockDREData.custosVariaveis.maoDeObraTemporaria}
            tooltip="Pagamentos a colaboradores temporários"
          />
          <DRELineItem
            label="Colheita"
            value={mockDREData.custosVariaveis.colheita}
            tooltip="Despesas com operações de colheita"
          />
          <DRELineItem
            label="Pós-Colheita"
            value={mockDREData.custosVariaveis.posColheita}
            tooltip="Processamento e preparação pós-colheita"
          />
          <DRELineItem
            label="Frete"
            value={mockDREData.custosVariaveis.frete}
            tooltip="Custos de transporte e logística"
          />
          <DRELineItem
            label="Outros Custos Variáveis"
            value={mockDREData.custosVariaveis.outrosCustosVariaveis}
            tooltip="Demais custos variáveis da operação"
          />
          <div className="py-3 border-t-2 border-gray-300 flex justify-between px-2">
            <p className="font-bold text-gray-900">Total Custos Variáveis</p>
            <p className="font-bold text-gray-900">{formatCurrency(custoVariavelTotal)}</p>
          </div>
        </DRESection>

        {/* BLOCO C - MARGEM DE CONTRIBUIÇÃO */}
        <DRESection title="BLOCO C — MARGEM DE CONTRIBUIÇÃO" color="gray">
          <DRELineItem
            label="Margem de Contribuição"
            value={mockDREData.margem}
            tooltip="Receita líquida menos custos variáveis"
          />
        </DRESection>

        {/* BLOCO D - CUSTOS FIXOS */}
        <DRESection title="BLOCO D — CUSTOS FIXOS" color="gray">
          <DRELineItem
            label="Mão de Obra Fixa"
            value={mockDREData.custosFixos.maoDeObraFixa}
            tooltip="Salários e remunerações fixas"
          />
          <DRELineItem
            label="Encargos Trabalhistas"
            value={mockDREData.custosFixos.encargosTrabalistas}
            tooltip="INSS, FGTS e demais encargos"
          />
          <DRELineItem
            label="Energia Elétrica"
            value={mockDREData.custosFixos.energiaEletrica}
            tooltip="Despesas com energia"
          />
          <DRELineItem
            label="Administração"
            value={mockDREData.custosFixos.administracao}
            tooltip="Custos administrativos gerais"
          />
          <DRELineItem
            label="Manutenção"
            value={mockDREData.custosFixos.manutencao}
            tooltip="Manutenção de máquinas e benfeitorias"
          />
          <DRELineItem
            label="Despesas Gerais"
            value={mockDREData.custosFixos.despesasGerais}
            tooltip="Outras despesas operacionais"
          />
          <div className="py-3 border-t-2 border-gray-300 flex justify-between px-2">
            <p className="font-bold text-gray-900">Total Custos Fixos</p>
            <p className="font-bold text-gray-900">{formatCurrency(custoFixoTotal)}</p>
          </div>
        </DRESection>

        {/* BLOCO E - RESULTADO OPERACIONAL */}
        <DRESection title="BLOCO E — RESULTADO OPERACIONAL" color="gray">
          <DRELineItem
            label="Resultado Operacional"
            value={mockDREData.resultadoOperacional}
            tooltip="Margem de contribuição menos custos fixos"
          />
        </DRESection>

        {/* BLOCO F - DEPRECIAÇÃO */}
        <DRESection title="BLOCO F — DEPRECIAÇÃO E AMORTIZAÇÃO" color="gray">
          <DRELineItem
            label="Depreciação de Máquinas"
            value="—"
            tooltip="Calculado a partir do cadastro de ativos da fazenda"
          />
          <DRELineItem
            label="Depreciação de Benfeitorias"
            value="—"
            tooltip="Depreciação de benfeitorias e infraestrutura"
          />
          <DRELineItem
            label="Amortizações"
            value="—"
            tooltip="Amortização de intangíveis"
          />
        </DRESection>

        {/* BLOCO G - EBITDA */}
        <DRESection title="BLOCO G — EBITDA" color="gray">
          <DRELineItem
            label="EBITDA"
            value={mockDREData.ebitda}
            tooltip="Resultado operacional antes de juros, impostos, depreciação e amortização"
          />
        </DRESection>

        {/* BLOCO H - IMPOSTOS */}
        <DRESection title="BLOCO H — IMPOSTOS" color="orange">
          <DRELineItem label="ICMS" value="—" tooltip="Preenchido automaticamente via NF ou integração contábil" />
          <DRELineItem label="Funrural" value="—" tooltip="Fundo de Assistência ao Trabalhador Rural" />
          <DRELineItem label="ISS" value="—" tooltip="Imposto Sobre Serviços" />
          <DRELineItem label="Outros Tributos" value="—" tooltip="Demais impostos e contribuições" />
        </DRESection>

        {/* BLOCO I - RESULTADO LÍQUIDO */}
        <DRESection title="BLOCO I — RESULTADO LÍQUIDO" color="green">
          <DRELineItem
            label="Resultado Líquido da Operação"
            value={resultadoLiquido > 0 ? resultadoLiquido : '—'}
            tooltip="Resultado final considerando os dados disponíveis"
          />
        </DRESection>
      </div>

      {/* ===== SEÇÃO 3: AJUSTES E COMPLEMENTOS MANUAIS ===== */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Informações Complementares</h3>
        <p className="text-sm text-gray-600 mb-6">Algumas informações podem ser preenchidas manualmente ou integradas posteriormente para refinar os resultados.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={<Plus className="w-5 h-5" />}
            title="Adicionar Custos Trabalhistas"
            description="Insira dados sobre salários, encargos e benefícios"
            onClick={() => setActiveModal('labor')}
          />
          <ActionCard
            icon={<Plus className="w-5 h-5" />}
            title="Adicionar Impostos Pagos"
            description="Registre impostos e contribuições já pagos"
            onClick={() => setActiveModal('taxes')}
          />
          <ActionCard
            icon={<Plus className="w-5 h-5" />}
            title="Cadastrar Ativos para Depreciação"
            description="Informe máquinas, benfeitorias e outras instalações"
            onClick={() => setActiveModal('assets')}
          />
        </div>
      </div>

      {/* ===== SEÇÃO 4: ORIGEM DOS DADOS & INTEGRAÇÕES ===== */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Origem dos Dados & Integrações</h3>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">De onde vêm os dados deste DRE</h4>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">Pagamentos registrados no Solos</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">Documentos enviados via WhatsApp</span>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-700">Notas fiscais (parcial – leitura em implementação)</span>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-gray-300" />
              <span className="text-sm text-gray-500">Encargos trabalhistas (manual ou contador)</span>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-gray-300" />
              <span className="text-sm text-gray-500">Integração fiscal (certificado digital)</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            A Solos evolui conforme o nível de integração autorizado pela fazenda. Quanto mais dados você registra e compartilha, mais preciso fica o resultado.
          </p>

          <div className="space-y-2">
            <button className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium cursor-not-allowed opacity-50 hover:bg-gray-50">
              Integrar contabilidade (em breve)
            </button>
            <button className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium cursor-not-allowed opacity-50 hover:bg-gray-50">
              Integrar NF / Certificado Digital (em breve)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
