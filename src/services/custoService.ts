export interface CustoConabItem {
  discriminacao: string;
  custoPorHa: number;
  custoPorSaca: number;
  participacaoCv: number;
  participacaoCt: number;
}

export interface CustoConabData {
  [categoria: string]: CustoConabItem[];
}

export class CustoConabService {
  // Dados baseados na tabela CONAB fornecida
  private static readonly CUSTO_CONAB_DATA: CustoConabItem[] = [
    // I - DESPESAS DO CUSTEIO
    { discriminacao: "Operação com animal", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Operação com Avião", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Operação com máquinas", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Tratores e Colheitadeiras", custoPorHa: 146.0800, custoPorSaca: 5.2172, participacaoCv: 0.6700, participacaoCt: 0.5500 },
    { discriminacao: "Conjunto de Irrigação", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Aluguel de Máquinas", custoPorHa: 962.5000, custoPorSaca: 34.3750, participacaoCv: 4.3900, participacaoCt: 3.6500 },
    { discriminacao: "Aluguel de Animais", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Mão de obra", custoPorHa: 11211.0100, custoPorSaca: 400.3932, participacaoCv: 51.0800, participacaoCt: 42.5100 },
    { discriminacao: "Administrador", custoPorHa: 169.4400, custoPorSaca: 6.0514, participacaoCv: 0.7700, participacaoCt: 0.6400 },
    { discriminacao: "Sementes e mudas", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Fertilizantes", custoPorHa: 4945.6900, custoPorSaca: 176.6318, participacaoCv: 22.5400, participacaoCt: 18.7500 },
    { discriminacao: "Agrotóxicos", custoPorHa: 1381.8300, custoPorSaca: 49.3511, participacaoCv: 6.3000, participacaoCt: 5.2400 },
    { discriminacao: "Receita", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Outros", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Embalagens/Utensílios", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Análise de Solo", custoPorHa: 22.5000, custoPorSaca: 0.8036, participacaoCv: 0.1000, participacaoCt: 0.0900 },
    { discriminacao: "Demais Despesas", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Serviços Diversos", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    
    // II - OUTRAS DESPESAS
    { discriminacao: "Transporte Externo", custoPorHa: 84.0000, custoPorSaca: 3.0000, participacaoCv: 0.3800, participacaoCt: 0.3200 },
    { discriminacao: "Despesas administrativas", custoPorHa: 565.1700, custoPorSaca: 20.1846, participacaoCv: 2.5800, participacaoCt: 2.1400 },
    { discriminacao: "Despesas de armazenagem", custoPorHa: 48.7300, custoPorSaca: 1.7404, participacaoCv: 0.2200, participacaoCt: 0.1800 },
    { discriminacao: "Beneficiamento", custoPorHa: 546.0000, custoPorSaca: 19.5000, participacaoCv: 2.4900, participacaoCt: 2.0700 },
    { discriminacao: "Seguro da Produção", custoPorHa: 470.9800, custoPorSaca: 16.8207, participacaoCv: 2.1500, participacaoCt: 1.7900 },
    { discriminacao: "Seguro do crédito", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Assistência Técnica", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Classificação", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Outros", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "CESSR", custoPorHa: 633.2900, custoPorSaca: 22.6175, participacaoCv: 2.8900, participacaoCt: 2.4000 },
    
    // III - DESPESAS FINANCEIRAS
    { discriminacao: "Juros de Financiamento", custoPorHa: 758.9500, custoPorSaca: 27.1054, participacaoCv: 3.4600, participacaoCt: 2.8800 },
    
    // IV - DEPRECIAÇÕES
    { discriminacao: "Depreciação de benfeitorias/instalações", custoPorHa: 35.6000, custoPorSaca: 1.2714, participacaoCv: 0.1600, participacaoCt: 0.1300 },
    { discriminacao: "Depreciação de implementos", custoPorHa: 10.7500, custoPorSaca: 0.3841, participacaoCv: 0.0500, participacaoCt: 0.0400 },
    { discriminacao: "Depreciação de máquinas", custoPorHa: 30.0000, custoPorSaca: 1.0714, participacaoCv: 0.1400, participacaoCt: 0.1100 },
    { discriminacao: "Exaustão do cultivo", custoPorHa: 934.2400, custoPorSaca: 33.3657, participacaoCv: 4.2600, participacaoCt: 3.5400 },
    
    // V - OUTROS CUSTOS FIXOS
    { discriminacao: "Manutenção Periódica Benfeitorias/Instalações", custoPorHa: 330.0000, custoPorSaca: 11.7857, participacaoCv: 1.5000, participacaoCt: 1.2500 },
    { discriminacao: "Encargos Sociais", custoPorHa: 77.2500, custoPorSaca: 2.7589, participacaoCv: 0.3500, participacaoCt: 0.2900 },
    { discriminacao: "Seguro do capital fixo", custoPorHa: 5.1400, custoPorSaca: 0.1836, participacaoCv: 0.0200, participacaoCt: 0.0200 },
    { discriminacao: "Arrendamento", custoPorHa: 1130.8700, custoPorSaca: 40.3883, participacaoCv: 5.1500, participacaoCt: 4.2900 },
    
    // VI - RENDA DE FATORES
    { discriminacao: "Remuneração esperada sobre o capital fixo", custoPorHa: 48.1500, custoPorSaca: 1.7196, participacaoCv: 0.2200, participacaoCt: 0.1800 },
    { discriminacao: "Remuneração esperada sobre o cultivo", custoPorHa: 32.8400, custoPorSaca: 1.1728, participacaoCv: 0.1500, participacaoCt: 0.1200 },
    { discriminacao: "Terra Própria", custoPorHa: 1792.6500, custoPorSaca: 64.0232, participacaoCv: 8.1700, participacaoCt: 6.8000 }
  ];

  /**
   * Retorna todos os custos por hectare mapeados por discriminação
   */
  static getCustosPorHectare(): { [discriminacao: string]: number } {
    const custosPorHa: { [discriminacao: string]: number } = {};
    
    this.CUSTO_CONAB_DATA.forEach(item => {
      custosPorHa[item.discriminacao] = item.custoPorHa;
    });
    
    return custosPorHa;
  }

  /**
   * Retorna todos os custos por saca mapeados por discriminação
   */
  static getCustosPorSaca(): { [discriminacao: string]: number } {
    const custosPorSaca: { [discriminacao: string]: number } = {};
    
    this.CUSTO_CONAB_DATA.forEach(item => {
      custosPorSaca[item.discriminacao] = item.custoPorSaca;
    });
    
    return custosPorSaca;
  }
static getAllCustos(): CustoConabItem[] {
  return this.CUSTO_CONAB_DATA;
}
  /**
   * Retorna um item específico por discriminação
   */
  static getCustoByDiscriminacao(discriminacao: string): CustoConabItem | null {
    return this.CUSTO_CONAB_DATA.find(item => 
      item.discriminacao.toLowerCase() === discriminacao.toLowerCase()
    ) || null;
  }

  /**
   * Retorna custos agrupados por categoria
   */
  static getCustosAgrupados(): CustoConabData {
    const grupos: CustoConabData = {
      "DESPESAS DO CUSTEIO": [],
      "OUTRAS DESPESAS": [],
      "DESPESAS FINANCEIRAS": [],
      "DEPRECIAÇÕES": [],
      "OUTROS CUSTOS FIXOS": [],
      "RENDA DE FATORES": []
    };

    // Mapear itens para suas respectivas categorias baseado na posição na tabela
    const despesasCusteio = this.CUSTO_CONAB_DATA.slice(0, 17);
    const outrasDespesas = this.CUSTO_CONAB_DATA.slice(17, 27);
    const despesasFinanceiras = this.CUSTO_CONAB_DATA.slice(27, 28);
    const depreciacoes = this.CUSTO_CONAB_DATA.slice(28, 32);
    const outrosCustosFixos = this.CUSTO_CONAB_DATA.slice(32, 36);
    const rendaFatores = this.CUSTO_CONAB_DATA.slice(36, 39);

    grupos["DESPESAS DO CUSTEIO"] = despesasCusteio;
    grupos["OUTRAS DESPESAS"] = outrasDespesas;
    grupos["DESPESAS FINANCEIRAS"] = despesasFinanceiras;
    grupos["DEPRECIAÇÕES"] = depreciacoes;
    grupos["OUTROS CUSTOS FIXOS"] = outrosCustosFixos;
    grupos["RENDA DE FATORES"] = rendaFatores;

    return grupos;
  }

  /**
   * Retorna os totais por categoria
   */
  static getTotaisPorCategoria(): { [categoria: string]: { custoPorHa: number; custoPorSaca: number } } {
    const grupos = this.getCustosAgrupados();
    const totais: { [categoria: string]: { custoPorHa: number; custoPorSaca: number } } = {};

    Object.entries(grupos).forEach(([categoria, itens]) => {
      const totalHa = itens.reduce((sum, item) => sum + item.custoPorHa, 0);
      const totalSaca = itens.reduce((sum, item) => sum + item.custoPorSaca, 0);
      
      totais[categoria] = {
        custoPorHa: parseFloat(totalHa.toFixed(4)),
        custoPorSaca: parseFloat(totalSaca.toFixed(4))
      };
    });

    return totais;
  }

  /**
   * Retorna o custo total geral
   */
  static getCustoTotal(): { custoPorHa: number; custoPorSaca: number } {
    const totalHa = this.CUSTO_CONAB_DATA.reduce((sum, item) => sum + item.custoPorHa, 0);
    const totalSaca = this.CUSTO_CONAB_DATA.reduce((sum, item) => sum + item.custoPorSaca, 0);
    
    return {
      custoPorHa: parseFloat(totalHa.toFixed(4)),
      custoPorSaca: parseFloat(totalSaca.toFixed(4))
    };
  }

  /**
   * Busca custos por termo de pesquisa
   */
  static buscarCustos(termo: string): CustoConabItem[] {
    const termoLower = termo.toLowerCase();
    return this.CUSTO_CONAB_DATA.filter(item =>
      item.discriminacao.toLowerCase().includes(termoLower)
    );
  }

  /**
   * Retorna apenas custos com valores maiores que zero
   */
  static getCustosComValor(): CustoConabItem[] {
    return this.CUSTO_CONAB_DATA.filter(item => 
      item.custoPorHa > 0 || item.custoPorSaca > 0
    );
  }

  /**
   * Formata valor monetário
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Formata número com 4 casas decimais
   */
  static formatNumber(value: number, decimals: number = 4): string {
    return value.toFixed(decimals).replace('.', ',');
  }
}