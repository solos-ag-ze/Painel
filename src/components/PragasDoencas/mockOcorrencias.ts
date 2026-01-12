export interface Ocorrencia {
  id: number;
  origem: 'WhatsApp' | 'Painel';
  talhao: string;
  dataOcorrencia: string;
  created_at?: string;
  faseLavoura: 'Vegetativo' | 'Floração' | 'Granação' | 'Pré-colheita' | 'Colheita' | 'Pós-colheita';
  tipoOcorrencia: 'Praga' | 'Doença' | 'Deficiência' | 'Planta daninha' | 'Não sei / Outra';
  severidade: 'Baixa' | 'Média' | 'Alta';
  areaAfetada: string;
  sintomas: string;
  acaoTomada: string;
  nomePraga?: string;
  diagnostico?: 'Sugerido pela IA (não confirmado)' | 'Confirmado pelo agrônomo' | 'Ainda em dúvida';
  descricaoDetalhada?: string;
  climaRecente?: string;
  produtosAplicados?: string[];
  dataAplicacao?: string;
  recomendacoes?: string;
  status: 'Nova' | 'Em acompanhamento' | 'Resolvida';
  anexos?: string[];
  fotoPrincipal?: string;
}

export const mockOcorrencias: Ocorrencia[] = [
  {
    id: 1,
    origem: 'WhatsApp',
    talhao: 'Talhão 3',
    dataOcorrencia: '2025-09-15',
    created_at: '2025-09-15T08:30:00',
    faseLavoura: 'Pré-colheita',
    tipoOcorrencia: 'Doença',
    severidade: 'Alta',
    areaAfetada: '~10% do talhão',
    sintomas: 'Manchas alaranjadas nas folhas',
    acaoTomada: 'Aplicado fungicida preventivo',
    nomePraga: 'Ferrugem do cafeeiro',
    diagnostico: 'Confirmado pelo agrônomo',
    descricaoDetalhada: 'Lesões típicas de ferrugem nas folhas inferiores, com esporulação abundante na face abaxial.',
    climaRecente: 'Semana com alta umidade e chuvas leves. Neblina pela manhã.',
    produtosAplicados: ['Fungicida X – 0,5 L/ha', 'Óleo mineral 0,5%'],
    dataAplicacao: '2025-09-16',
    recomendacoes: 'Reavaliar em 7 dias. Se persistir, fazer segunda aplicação. Monitorar plantas vizinhas.',
    status: 'Em acompanhamento',
    anexos: ['foto1_ferrugem.jpg', 'laudo_agronomico.pdf'],
    fotoPrincipal: '🍂',
  },
  {
    id: 2,
    origem: 'Painel',
    talhao: 'Talhão 1',
    dataOcorrencia: '2025-10-05',
    created_at: '2025-10-05T14:45:00',
    faseLavoura: 'Floração',
    tipoOcorrencia: 'Praga',
    severidade: 'Média',
    areaAfetada: '~20% das plantas',
    sintomas: 'Folhas com furos pequenos e borda mastigada.',
    acaoTomada: 'Ainda não fiz nada.',
    diagnostico: 'Sugerido pela IA (não confirmado)',
    status: 'Nova',
    fotoPrincipal: '🐛',
  },
  {
    id: 3,
    origem: 'WhatsApp',
    talhao: 'Talhão 5',
    dataOcorrencia: '2025-10-20',
    faseLavoura: 'Granação',
    tipoOcorrencia: 'Deficiência',
    severidade: 'Média',
    areaAfetada: '~5% do talhão',
    sintomas: 'Amarelecimento internerval nas folhas novas',
    acaoTomada: 'Aplicado quelato de ferro via foliar',
    nomePraga: 'Deficiência de Ferro',
    diagnostico: 'Confirmado pelo agrônomo',
    descricaoDetalhada: 'Deficiência típica de micronutriente em solo com pH elevado.',
    climaRecente: 'Seco por 2 semanas, após período chuvoso.',
    produtosAplicados: ['Quelato de ferro EDTA – 2 L/ha'],
    dataAplicacao: '2025-10-21',
    recomendacoes: 'Reavaliar coloração em 10 dias. Se não melhorar, aplicar novamente.',
    status: 'Em acompanhamento',
    anexos: ['analise_solo.pdf'],
    fotoPrincipal: '🌱',
  },
  {
    id: 4,
    origem: 'Painel',
    talhao: 'Talhão 2',
    dataOcorrencia: '2025-09-28',
    faseLavoura: 'Pré-colheita',
    tipoOcorrencia: 'Planta daninha',
    severidade: 'Baixa',
    areaAfetada: '~2% do talhão',
    sintomas: 'Presença de capim-colchão disperso entre as linhas',
    acaoTomada: 'Roçada direcionada realizada',
    status: 'Resolvida',
    fotoPrincipal: '🌾',
  },
  {
    id: 5,
    origem: 'WhatsApp',
    talhao: 'Talhão 4',
    dataOcorrencia: '2025-10-10',
    faseLavoura: 'Granação',
    tipoOcorrencia: 'Praga',
    severidade: 'Alta',
    areaAfetada: '~15% das plantas',
    sintomas: 'Presença de vagens danificadas e queda de flores',
    acaoTomada: 'Inseticida aplicado',
    nomePraga: 'Bicho-mineiro do cafeeiro',
    diagnostico: 'Sugerido pela IA (não confirmado)',
    descricaoDetalhada: 'Danos típicos em frutos em desenvolvimento. Pragas visíveis em inspeção de campo.',
    climaRecente: 'Temperatura média de 24°C, com umidade de 70%.',
    produtosAplicados: ['Inseticida sistêmico – 1 L/ha'],
    dataAplicacao: '2025-10-11',
    recomendacoes: 'Monitorar por mais 14 dias. Segunda aplicação se necessário.',
    status: 'Em acompanhamento',
    anexos: ['evidencia_praga.jpg'],
    fotoPrincipal: '🔴',
  },
];
