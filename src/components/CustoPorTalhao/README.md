# Custo por Talhão (Competência por Área)

## 📋 Visão Geral

Nova aba no painel Solos.ag que permite visualizar e analisar custos agrícolas consolidados por talhão e macrogrupo de despesas.

## 🎯 Funcionalidades

### 1. Filtros Avançados
- **Safra**: Seleção de safra agrícola
- **Fazenda**: Filtragem por propriedade
- **Talhão**: Seleção múltipla de talhões
- **Macrogrupo**: Filtro por categoria de custo
- **Período**: Seleção por mês/ano

### 2. Cards de Indicadores
- **Total de Custos**: Soma consolidada de todos os custos
- **Custo Médio/ha**: Média de custo por hectare
- **% por Macrogrupo**: Distribuição percentual com gráfico de barras
- **Pendências**: Contador de itens que requerem atenção

### 3. Tabela Principal
Exibe custos por talhão com colunas:
- Talhão (nome)
- Insumos
- Operacional
- Serviços/Logística
- Administrativos
- Outros
- Total
- R$/ha (custo por hectare)

**Interação**: Clique em qualquer linha para ver detalhes no painel lateral.

### 4. Painel Lateral (Drill-down)
Ao clicar em um talhão, abre painel lateral com:
- Tabela detalhada de transações
- Colunas: Data, Categoria, Descrição, Origem, Valor
- Rodapé com totalizadores
- Botão "Ver anexos"

### 5. Modal de Pendências
Exibe lista de itens que necessitam atenção:
- Notas fiscais sem detalhamento
- Consumos sem estoque correspondente
- Link direto para correção no módulo Estoque

## 🎨 Identidade Visual

### Cores Oficiais Solos.ag
- **Verde escuro**: `#004417`
- **Verde claro**: `#00A651`
- **Verde-lima**: `#CADB2A`
- **Laranja**: `#F7941F`
- **Branco**: `#FFFFFF`

### Estilos Aplicados
- Bordas: `1px solid rgba(0,68,23,0.08)`
- Sombras: `0 2px 8px rgba(0,68,23,0.08)`
- Border radius: `12px`
- Fonte: Nunito (weight 600-700)

## 🛣️ Roteamento

- **Rota**: `/painel/custo-por-talhao`
- **ID interno**: `custo-por-talhao`
- **Posição no menu**: Entre "Custo Safra" e "Minha Fazenda"
- **Ícone**: `BarChart3` (lucide-react)

## 📂 Estrutura de Arquivos

```
src/components/CustoPorTalhao/
  ├── CustoPorTalhaoPanel.tsx    # Componente principal
  └── README.md                   # Esta documentação

src/services/
  └── custoPorTalhaoService.ts   # Serviço de dados
```

## 🔌 Integração com Backend

O serviço `custoPorTalhaoService.ts` fornece:

### Métodos Disponíveis
1. `getCustosPorTalhao(userId, filtros)` - Lista custos por talhão
2. `getDetalhesCustoTalhao(userId, talhaoId, filtros)` - Detalhes de um talhão
3. `getPendencias(userId)` - Lista de pendências
4. `getIndicadores(userId, filtros)` - Indicadores consolidados
5. `getSafras(userId)` - Lista de safras disponíveis
6. `getFazendas(userId)` - Lista de propriedades
7. `getTalhoes(userId, fazendaId?)` - Lista de talhões

### Dados Mockados
Atualmente o componente utiliza dados mockados para demonstração. Para integração real:
1. Remover os arrays `custosTalhaoMock`, `detalhesCustoMock`, `pendenciasMock`
2. Implementar chamadas aos métodos do serviço
3. Ajustar interfaces conforme estrutura real do Supabase

## 📱 Responsividade

| Largura | Comportamento |
|---------|---------------|
| ≥1280px | Cards 2x2 + tabela completa |
| 1024-1279px | Cards empilhados |
| ≤1024px | Scroll horizontal na tabela |
| ≤768px | Layout tipo acordeão |

## 🔧 Próximos Passos (Implementação Real)

1. **Integrar com Supabase**
   - Criar views SQL para consolidar custos por talhão
   - Implementar queries no `custoPorTalhaoService.ts`

2. **Cálculo de Custos**
   - Mapear transações financeiras por talhão
   - Consolidar custos de atividades agrícolas
   - Calcular totais por macrogrupo

3. **Sistema de Pendências**
   - Criar trigger para detectar inconsistências
   - Implementar notificações automáticas

4. **Anexos**
   - Integrar com sistema de anexos compartilhados existente
   - Adicionar visualização de documentos

5. **Exportação**
   - Adicionar opção de exportar para Excel/PDF
   - Implementar impressão formatada

## ⚠️ Observações Importantes

- ✅ Nenhuma funcionalidade existente foi alterada
- ✅ Componente totalmente independente
- ✅ Segue padrões visuais do projeto
- ✅ Estrutura modular e escalável
- ✅ Preparado para integração real com backend

## 📊 Macrogrupos de Custo

1. **Insumos**: Fertilizantes, defensivos, sementes
2. **Operacional**: Combustível, manutenção, reparos
3. **Serviços/Logística**: Transporte, armazenagem, terceirizados
4. **Administrativos**: Despesas fixas, seguros, impostos
5. **Outros**: Despesas diversas

## 🎯 Casos de Uso

1. **Análise de rentabilidade por talhão**
2. **Comparação de custos entre áreas**
3. **Identificação de talhões com custos elevados**
4. **Acompanhamento de evolução de custos ao longo da safra**
5. **Tomada de decisão sobre investimentos por área**
