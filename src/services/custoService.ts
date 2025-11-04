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
    { discriminacao: "Máquinas e Equipamentos", custoPorHa: 146.0800, custoPorSaca: 5.2172, participacaoCv: 0.6700, participacaoCt: 0.5500 },
    { discriminacao: "Irrigação", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Aluguel de Máquinas", custoPorHa: 962.5000, custoPorSaca: 34.3750, participacaoCv: 4.3900, participacaoCt: 3.6500 },
    { discriminacao: "Mão de obra", custoPorHa: 11211.0100, custoPorSaca: 400.3932, participacaoCv: 51.0800, participacaoCt: 42.5100 },
    { discriminacao: "Gestão/Administração", custoPorHa: 169.4400, custoPorSaca: 6.0514, participacaoCv: 0.7700, participacaoCt: 0.6400 },
    { discriminacao: "Sementes e mudas", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Fertilizantes", custoPorHa: 4945.6900, custoPorSaca: 176.6318, participacaoCv: 22.5400, participacaoCt: 18.7500 },
    { discriminacao: "Defensivos Agrícolas", custoPorHa: 1381.8300, custoPorSaca: 49.3511, participacaoCv: 6.3000, participacaoCt: 5.2400 },
    { discriminacao: "Receita", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Outros", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Embalagens", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Análise de Solo", custoPorHa: 22.5000, custoPorSaca: 0.8036, participacaoCv: 0.1000, participacaoCt: 0.0900 },
    { discriminacao: "Despesas Gerais", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Serviços Diversos", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    
    // II - OUTRAS DESPESAS
    { discriminacao: "Transporte", custoPorHa: 84.0000, custoPorSaca: 3.0000, participacaoCv: 0.3800, participacaoCt: 0.3200 },
    { discriminacao: "Despesas administrativas", custoPorHa: 565.1700, custoPorSaca: 20.1846, participacaoCv: 2.5800, participacaoCt: 2.1400 },
    { discriminacao: "Despesas de armazenagem", custoPorHa: 48.7300, custoPorSaca: 1.7404, participacaoCv: 0.2200, participacaoCt: 0.1800 },
    { discriminacao: "Beneficiamento", custoPorHa: 546.0000, custoPorSaca: 19.5000, participacaoCv: 2.4900, participacaoCt: 2.0700 },
    { discriminacao: "Seguro", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Assistência Técnica", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },
    { discriminacao: "Classificação", custoPorHa: 0.0000, custoPorSaca: 0.0000, participacaoCv: 0.0000, participacaoCt: 0.0000 },

    // V - OUTROS CUSTOS FIXOS
    { discriminacao: "Manutenção e Instalações", custoPorHa: 330.0000, custoPorSaca: 11.7857, participacaoCv: 1.5000, participacaoCt: 1.2500 },
    { discriminacao: "Encargos Sociais", custoPorHa: 77.2500, custoPorSaca: 2.7589, participacaoCv: 0.3500, participacaoCt: 0.2900 },
    { discriminacao: "Arrendamento", custoPorHa: 1130.8700, custoPorSaca: 40.3883, participacaoCv: 5.1500, participacaoCt: 4.2900 }
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
      "OUTROS CUSTOS FIXOS": []
    };

    // Mapear itens para suas respectivas categorias baseado na posição na tabela
    const despesasCusteio = this.CUSTO_CONAB_DATA.slice(0, 14);
    const outrasDespesas = this.CUSTO_CONAB_DATA.slice(14, 21);
    const outrosCustosFixos = this.CUSTO_CONAB_DATA.slice(21, 24);

    grupos["DESPESAS DO CUSTEIO"] = despesasCusteio;
    grupos["OUTRAS DESPESAS"] = outrasDespesas;
    grupos["OUTROS CUSTOS FIXOS"] = outrosCustosFixos;

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