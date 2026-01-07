# Copilot Instructions — Painel Solos.ag

## Contexto

SPA agrícola para cafeicultores brasileiros: **React 18 + TypeScript + Vite + TailwindCSS + Supabase**. Autenticação via JWT do n8n (armazenado em `localStorage` como `ze_safra_token`). Supabase usa RLS em produção, bypass DEV com `service_role`.

## Arquitetura

```
App.tsx (auth check + renderContent switch)
├─ Sidebar (menuItems[] → activeTab state)
├─ [Domínio]Panel (useState/useEffect → Service calls)
│   └─ Service.método() [classe estática, métodos estáticos]
│       └─ supabase singleton (RLS ou service_role)
└─ Header + main content
```

**Navegação:** Tab-based via `activeTab` state — **sem React Router**. Sidebar define `menuItems[]` em `src/components/Layout/Sidebar.tsx`; App.tsx faz switch em `renderContent()`.

## Padrões Obrigatórios

### Services (`src/services/`)

- **NUNCA** query Supabase direto em componentes — sempre via Services
- Services são **classes com métodos estáticos** (exceto AuthService que é singleton)
- **SEMPRE retorne `[]` ou `null` em erro** — nunca lance exceção
- Trate `error` de toda query Supabase com log + fallback

```typescript
// Padrão correto:
static async getDados(userId: string): Promise<Dado[]> {
  const { data, error } = await supabase
    .from('tabela')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao buscar dados:', error);
    return [];  // NUNCA throw
  }
  return data || [];
}
```

### Autenticação

- **AuthService é singleton:** `AuthService.getInstance().getCurrentUser()`
- **User ID:** sempre `AuthService.getInstance().getCurrentUser()?.user_id`
- JWT decodificado localmente (não usa Supabase Auth nativo)
- **DEV:** localhost/127.0.0.1 usa `service_role` key (bypass RLS)
- **PROD:** JWT injetado via `setAccessToken()` para RLS funcionar

### Componentes Panel

- Sempre usar estado `loading` com `<LoadingSpinner />` de `../Dashboard/LoadingSpinner`
- Buscar dados em `useEffect` inicial, setar `loading = false` após

```typescript
const [loading, setLoading] = useState(true);
useEffect(() => {
  async function load() {
    const userId = AuthService.getInstance().getCurrentUser()?.user_id;
    if (!userId) { setLoading(false); return; }
    const dados = await MeuService.getDados(userId);
    setDados(dados);
    setLoading(false);
  }
  load();
}, []);
if (loading) return <LoadingSpinner />;
```

### Utilitários Obrigatórios (`src/lib/`)

| Utilitário                | Uso                                              | Arquivo              |
| ------------------------- | ------------------------------------------------ | -------------------- |
| `parseDateFromDB()`       | Converte datas DB → Date (evita bug timezone BR) | `dateUtils.ts`       |
| `formatDateBR()`          | Data para dd/MM/yyyy                             | `dateUtils.ts`       |
| `formatCurrency()`        | Valor para R$ 1.234,56                           | `currencyFormatter.ts` |
| `formatSmartCurrency()`   | Decimais dinâmicos (valores pequenos)            | `currencyFormatter.ts` |
| `convertToStandardUnit()` | Normaliza unidades (kg→mg, L→mL) para FIFO       | `unitConverter.ts`   |

## Criar Novo Módulo

1. `src/components/NovoModulo/NovoModuloPanel.tsx` — usar pattern de loading acima
2. `src/services/novoModuloService.ts` — classe estática com métodos async
3. `src/components/Layout/Sidebar.tsx` → adicionar em `menuItems[]`
4. `src/App.tsx` → adicionar import + case em `renderContent()` switch

## Serviços Existentes

| Serviço                        | Responsabilidade                        |
| ------------------------------ | --------------------------------------- |
| `AuthService`                  | Singleton, JWT decode, getCurrentUser() |
| `FinanceService`               | Transações financeiras, resumos, saldos |
| `ActivityService`              | Lançamentos de manejo agrícola          |
| `EstoqueService`               | Produtos, movimentações FIFO            |
| `TalhaoService`                | Talhões e áreas da fazenda              |
| `MaquinaService`               | Máquinas e equipamentos                 |
| `PragasDoencasService`         | Ocorrências de pragas/doenças           |
| `DividasFinanciamentosService` | Dívidas rurais e financiamentos         |
| `DocumentosService`            | CAR, CPF, ITR, contratos                |
| `AttachmentService`            | Upload/download de arquivos (Storage)   |
| `CotacaoService`               | Cotação do café em tempo real           |
| `CustoPorTalhaoService`        | Análise de custos por área              |

## Identidade Visual

Cores principais (usar exatamente):
- **Verde escuro (bg):** `#004417`, `#003015`
- **Verde claro (destaque):** `#86b646`, `#00A651`
- **Verde médio (botões):** `#397738`
- **Texto escuro:** `#092f20`
- **Fundo:** `bg-gray-50`, cards `bg-white`

## Comandos

```bash
npm run dev      # Dev server :5173
npm run build    # Build produção
npm run lint     # ESLint check
```

## Armadilhas Críticas ⚠️

| Armadilha | Solução |
| --------- | ------- |
| **Datas mostram dia anterior** | SEMPRE use `parseDateFromDB()` — JS converte UTC→local (UTC-3 no Brasil) |
| **Exceções em Services** | Services NUNCA lançam — retornam `[]`/`null` e logam erro |
| **React Router** | NÃO existe — navegação é por `activeTab` state no App.tsx |
| **Supabase em componentes** | NUNCA query direto — sempre via Service |
| **Ícones** | Usar APENAS `lucide-react` — não instalar outras libs |
| **DEV bypass** | Detectado por `import.meta.env.MODE`, hostname ou `VITE_ZE_AMBIENTE` |

## Componentes Reutilizáveis

- `src/components/common/DateInput.tsx` — input de data com calendário
- `src/components/common/CurrencyInput.tsx` — input monetário formatado
- `src/components/common/SuccessToast.tsx` — notificação de sucesso
- `src/components/Dashboard/LoadingSpinner.tsx` — loading padrão
- `src/components/Dashboard/ErrorMessage.tsx` — mensagem de erro

## Convenções de Código

- **Nomes em português** para variáveis/funções do domínio agrícola (talhao, safra, colheita)
- **TypeScript strict:** evite `any`, prefira interfaces para objetos
- **Menor mudança possível:** não refatore código não relacionado ao problema
- **Comentários:** apenas o "porquê", nunca o "o quê"

---

## Schema do Banco de Dados (Supabase/PostgreSQL)

### Tabelas Principais

| Tabela | Descrição | Chave Primária |
|--------|-----------|----------------|
| `usuarios` | Usuários do sistema (produtores) | `user_id` (uuid) |
| `propriedades` | Fazendas/propriedades rurais | `id_propriedade` (uuid) |
| `talhoes` | Áreas de plantio dentro das propriedades | `id_talhao` (uuid) |
| `transacoes_financeiras` | Fluxo de caixa (receitas/despesas) | `id_transacao` (uuid) |
| `lancamentos_agricolas` | Atividades de manejo (pulverização, adubação) | `atividade_id` (uuid) |
| `estoque_de_produtos` | Insumos agrícolas (FIFO) | `id` (bigint) |
| `maquinas_equipamentos` | Tratores, pulverizadores, etc. | `id_maquina` (uuid) |
| `pragas_e_doencas` | Ocorrências fitossanitárias | `id` (bigint) |
| `dividas_financiamentos` | Crédito rural, CPR, custeio | `id` (uuid) |
| `documentos` | Arquivos (CAR, contratos, notas) | `id` (bigint) |

### Tabelas de Relacionamento (N:N)

| Tabela | Relaciona |
|--------|-----------|
| `lancamento_talhoes` | `lancamentos_agricolas` ↔ `talhoes` |
| `lancamento_produtos` | `lancamentos_agricolas` ↔ `estoque_de_produtos` |
| `lancamento_maquinas` | `lancamentos_agricolas` ↔ `maquinas_equipamentos` |
| `lancamento_responsaveis` | `lancamentos_agricolas` ↔ responsáveis (texto) |
| `transacoes_talhoes` | `transacoes_financeiras` ↔ `talhoes` |
| `transacoes_talhoes_alocacao` | Alocação % de custos por talhão |
| `pragas_e_doencas_talhoes` | `pragas_e_doencas` ↔ `talhoes` |
| `vinculo_usuario_propriedade` | `usuarios` ↔ `propriedades` |

### Colunas Importantes

**Padrão de auditoria:**
- `user_id` — sempre presente, FK para `usuarios`
- `created_at` — timestamp de criação (timezone UTC)
- `updated_at` — timestamp de atualização

**Campos de anexo (Storage):**
- `anexo_url` / `arquivo_url` — URL pública do arquivo
- `esperando_por_anexo` — flag para fluxo assíncrono de upload

**Estoque FIFO:**
- `estoque_de_produtos.produto_id` — UUID para agrupar entradas do mesmo produto
- `estoque_de_produtos.entrada_referencia_id` — referência para baixa FIFO
- `estoque_de_produtos.tipo_de_movimentacao` — 'entrada' | 'saida' | 'aplicacao'

### DDL Completo

<details>
<summary>Clique para expandir o schema SQL completo</summary>

```sql
-- usuarios: Produtores rurais
CREATE TABLE public.usuarios (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  cidade text,
  cultura text,
  estado text,
  pais text,
  status text,
  cafe_com_ze_diario text,
  created_at timestamp with time zone DEFAULT now(),
  cafe_com_ze boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  ultima_interacao timestamp with time zone,
  cpf numeric,
  cnpj numeric,
  car numeric,
  CONSTRAINT usuarios_pkey PRIMARY KEY (user_id)
);

-- propriedades: Fazendas
CREATE TABLE public.propriedades (
  id_propriedade uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  area_total numeric NOT NULL,
  cultura_principal character varying DEFAULT 'Café'::character varying,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  user_id uuid,
  area_cafe_ha numeric,
  area_outras_culturas_ha numeric,
  outras_culturas text,
  CONSTRAINT propriedades_pkey PRIMARY KEY (id_propriedade),
  CONSTRAINT propriedades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- talhoes: Áreas de plantio
CREATE TABLE public.talhoes (
  id_talhao uuid NOT NULL DEFAULT gen_random_uuid(),
  id_propriedade uuid NOT NULL,
  criado_por uuid NOT NULL,
  data_criacao timestamp with time zone DEFAULT now(),
  nome character varying NOT NULL,
  area numeric NOT NULL,
  ultima_modificacao text,
  cultura character varying NOT NULL,
  ativo boolean DEFAULT true,
  talhao_default boolean DEFAULT false,
  produtividade_saca numeric,
  variedade_plantada text,
  quantidade_de_pes numeric,
  ano_de_plantio date,
  motivo_inativacao text,
  user_id uuid,
  CONSTRAINT talhoes_pkey PRIMARY KEY (id_talhao),
  CONSTRAINT fk_propriedade FOREIGN KEY (id_propriedade) REFERENCES public.propriedades(id_propriedade),
  CONSTRAINT talhoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- transacoes_financeiras: Fluxo de caixa
CREATE TABLE public.transacoes_financeiras (
  id_transacao uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_transacao text NOT NULL,
  valor numeric NOT NULL,
  data_transacao date NOT NULL,
  descricao text,
  pagador_recebedor text,
  categoria text NOT NULL,
  forma_pagamento_recebimento text NOT NULL,
  status text NOT NULL,
  data_agendamento_pagamento date,
  data_registro timestamp with time zone DEFAULT now(),
  esperando_por_anexo boolean DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  numero_parcelas integer NOT NULL DEFAULT 1,
  id_transacao_pai uuid,
  tipo_pagamento text,
  parcela text,
  anexo_compartilhado_url text,
  id_grupo_anexo uuid,
  parcela_com_anexo_original boolean DEFAULT false,
  anexo_arquivo_url text,
  area_vinculada text,
  propriedade_id uuid,
  CONSTRAINT transacoes_financeiras_pkey PRIMARY KEY (id_transacao),
  CONSTRAINT transacoes_financeiras_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id),
  CONSTRAINT transacoes_financeiras_propriedade_id_fkey FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id_propriedade)
);

-- lancamentos_agricolas: Atividades de manejo
CREATE TABLE public.lancamentos_agricolas (
  atividade_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_atividade text NOT NULL CHECK (char_length(nome_atividade) <= 30),
  data_atividade date NOT NULL,
  area_atividade text NOT NULL,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  esperando_por_anexo boolean DEFAULT false,
  estoque_excedido boolean NOT NULL DEFAULT false,
  CONSTRAINT lancamentos_agricolas_pkey PRIMARY KEY (atividade_id),
  CONSTRAINT lancamentos_agricolas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- lancamento_talhoes: N:N atividades ↔ talhões
CREATE TABLE public.lancamento_talhoes (
  atividade_id uuid NOT NULL,
  talhao_id uuid NOT NULL,
  user_id uuid,
  CONSTRAINT lancamento_talhoes_pkey PRIMARY KEY (atividade_id, talhao_id),
  CONSTRAINT lancamento_talhoes_atividade_id_fkey FOREIGN KEY (atividade_id) REFERENCES public.lancamentos_agricolas(atividade_id),
  CONSTRAINT lancamento_talhoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- lancamento_produtos: Produtos usados em atividades
CREATE TABLE public.lancamento_produtos (
  id bigint NOT NULL,
  atividade_id uuid NOT NULL,
  nome_produto text NOT NULL,
  quantidade_val numeric,
  quantidade_un text,
  dose_val numeric,
  dose_un text,
  produto_id bigint,
  unidade_medida text,
  quantidade_total_usada numeric,
  qtd_excedente numeric NOT NULL DEFAULT 0,
  estoque_excedido boolean NOT NULL DEFAULT false,
  preco_medio_usado numeric NOT NULL DEFAULT 0,
  custo_total_item numeric NOT NULL DEFAULT 0,
  user_id uuid,
  CONSTRAINT lancamento_produtos_pkey PRIMARY KEY (id),
  CONSTRAINT lancamento_produtos_atividade_id_fkey FOREIGN KEY (atividade_id) REFERENCES public.lancamentos_agricolas(atividade_id),
  CONSTRAINT lancamento_produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- lancamento_maquinas: Máquinas usadas em atividades
CREATE TABLE public.lancamento_maquinas (
  id bigint NOT NULL,
  atividade_id uuid NOT NULL,
  maquina_id uuid,
  nome_maquina text NOT NULL,
  horas_maquina numeric,
  user_id uuid,
  CONSTRAINT lancamento_maquinas_pkey PRIMARY KEY (id),
  CONSTRAINT lancamento_maquinas_atividade_id_fkey FOREIGN KEY (atividade_id) REFERENCES public.lancamentos_agricolas(atividade_id),
  CONSTRAINT lancamento_maquinas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- lancamento_responsaveis: Responsáveis por atividades
CREATE TABLE public.lancamento_responsaveis (
  id bigint NOT NULL,
  atividade_id uuid NOT NULL,
  nome text NOT NULL,
  user_id uuid,
  CONSTRAINT lancamento_responsaveis_pkey PRIMARY KEY (id),
  CONSTRAINT lancamento_responsaveis_atividade_id_fkey FOREIGN KEY (atividade_id) REFERENCES public.lancamentos_agricolas(atividade_id),
  CONSTRAINT lancamento_responsaveis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- estoque_de_produtos: Insumos agrícolas (FIFO)
CREATE TABLE public.estoque_de_produtos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  propriedade_id uuid,
  nome_do_produto text,
  marca_ou_fabricante text,
  categoria text,
  unidade_de_medida text,
  quantidade_em_estoque numeric,
  valor_unitario numeric,
  lote text,
  validade date,
  anexo_url text,
  esperando_por_anexo boolean NOT NULL DEFAULT false,
  fornecedor text,
  registro_mapa text,
  observacoes_das_movimentacoes text,
  unidade_valor_original text,
  valor_total numeric,
  quantidade_inicial numeric NOT NULL DEFAULT 0,
  valor_medio numeric,
  tipo_de_movimentacao text,
  produto_id uuid DEFAULT gen_random_uuid(),
  entrada_referencia_id integer,
  CONSTRAINT estoque_de_produtos_pkey PRIMARY KEY (id),
  CONSTRAINT estoque_de_produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id),
  CONSTRAINT estoque_de_produtos_propriedade_id_fkey FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id_propriedade),
  CONSTRAINT estoque_de_produtos_entrada_referencia_id_fkey FOREIGN KEY (entrada_referencia_id) REFERENCES public.estoque_de_produtos(id)
);

-- maquinas_equipamentos: Tratores, pulverizadores, etc.
CREATE TABLE public.maquinas_equipamentos (
  id_maquina uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  id_propriedade uuid,
  nome text NOT NULL,
  categoria text NOT NULL,
  marca_modelo text,
  horimetro_atual numeric,
  data_compra date,
  valor_compra numeric,
  fornecedor text,
  numero_serie text,
  url_primeiro_envio text,
  url_segundo_envio text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  esperando_primeiro_envio boolean NOT NULL DEFAULT false,
  esperando_segundo_envio boolean NOT NULL DEFAULT false,
  CONSTRAINT maquinas_equipamentos_pkey PRIMARY KEY (id_maquina),
  CONSTRAINT fk_id_propriedade FOREIGN KEY (id_propriedade) REFERENCES public.propriedades(id_propriedade),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- pragas_e_doencas: Ocorrências fitossanitárias
CREATE TABLE public.pragas_e_doencas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  talhoes text,
  data_da_ocorrencia date,
  fase_da_lavoura text,
  tipo_de_ocorrencia text,
  nivel_da_gravidade text,
  area_afetada text,
  sintomas_observados text,
  acao_tomada text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  origem text DEFAULT 'Painel'::text,
  nome_praga text,
  diagnostico text,
  descricao_detalhada text,
  clima_recente text,
  produtos_aplicados jsonb DEFAULT '[]'::jsonb,
  data_aplicacao date,
  recomendacoes text,
  status text DEFAULT 'Nova'::text,
  anexos jsonb DEFAULT '[]'::jsonb,
  foto_principal text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pragas_e_doencas_pkey PRIMARY KEY (id),
  CONSTRAINT pragas_e_doencas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- pragas_e_doencas_talhoes: N:N pragas ↔ talhões
CREATE TABLE public.pragas_e_doencas_talhoes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  praga_doenca_id bigint,
  talhao_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT pragas_e_doencas_talhoes_pkey PRIMARY KEY (id),
  CONSTRAINT pragas_e_doencas_talhoes_praga_doenca_id_fkey FOREIGN KEY (praga_doenca_id) REFERENCES public.pragas_e_doencas(id),
  CONSTRAINT pragas_e_doencas_talhoes_talhao_id_fkey FOREIGN KEY (talhao_id) REFERENCES public.talhoes(id_talhao),
  CONSTRAINT pragas_e_doencas_talhoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- dividas_financiamentos: Crédito rural
CREATE TABLE public.dividas_financiamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  credor text NOT NULL,
  tipo text NOT NULL,
  data_contratacao date NOT NULL,
  valor_contratado numeric NOT NULL,
  taxa text,
  carencia text,
  garantia text,
  responsavel text NOT NULL,
  observacoes text,
  forma_pagamento text NOT NULL,
  situacao text NOT NULL DEFAULT 'Ativa'::text CHECK (situacao = ANY (ARRAY['Ativa'::text, 'Liquidada'::text, 'Renegociada'::text])),
  juros_aa text,
  indexador text,
  indexador_outro text,
  pagamento_parcela jsonb,
  pagamento_parcelado jsonb,
  pagamento_producao jsonb,
  cronograma_manual text,
  anexos ARRAY DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dividas_financiamentos_pkey PRIMARY KEY (id),
  CONSTRAINT dividas_financiamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- documentos: Arquivos (CAR, contratos, notas)
CREATE TABLE public.documentos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  propriedade_id uuid,
  arquivo_url text,
  status text,
  tipo text,
  titulo text,
  safra text,
  tema text,
  observacao text,
  CONSTRAINT documentos_pkey PRIMARY KEY (id),
  CONSTRAINT documentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id),
  CONSTRAINT documentos_propriedade_id_fkey FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id_propriedade)
);

-- transacoes_talhoes: N:N transações ↔ talhões
CREATE TABLE public.transacoes_talhoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_transacao uuid,
  id_talhao uuid,
  user_id uuid,
  CONSTRAINT transacoes_talhoes_pkey PRIMARY KEY (id),
  CONSTRAINT transacoes_talhoes_id_transacao_fkey FOREIGN KEY (id_transacao) REFERENCES public.transacoes_financeiras(id_transacao),
  CONSTRAINT transacoes_talhoes_id_talhao_fkey FOREIGN KEY (id_talhao) REFERENCES public.talhoes(id_talhao),
  CONSTRAINT transacoes_talhoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- transacoes_talhoes_alocacao: Alocação % de custos
CREATE TABLE public.transacoes_talhoes_alocacao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_transacao uuid NOT NULL,
  id_talhao uuid NOT NULL,
  percentual_alocacao numeric NOT NULL CHECK (percentual_alocacao >= 0 AND percentual_alocacao <= 100),
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT transacoes_talhoes_alocacao_pkey PRIMARY KEY (id),
  CONSTRAINT transacoes_talhoes_alocacao_id_transacao_fkey FOREIGN KEY (id_transacao) REFERENCES public.transacoes_financeiras(id_transacao),
  CONSTRAINT transacoes_talhoes_alocacao_id_talhao_fkey FOREIGN KEY (id_talhao) REFERENCES public.talhoes(id_talhao)
);

-- vinculo_usuario_propriedade: N:N usuários ↔ propriedades
CREATE TABLE public.vinculo_usuario_propriedade (
  id_propriedade uuid NOT NULL,
  user_id uuid NOT NULL,
  papel text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vinculo_usuario_propriedade_pkey PRIMARY KEY (id_propriedade, user_id),
  CONSTRAINT vinculo_usuario_propriedade_id_propriedade_fkey FOREIGN KEY (id_propriedade) REFERENCES public.propriedades(id_propriedade),
  CONSTRAINT vinculo_usuario_propriedade_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(user_id)
);

-- cotacao_diaria_cafe: Preços do café
CREATE TABLE public.cotacao_diaria_cafe (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cultura text DEFAULT 'Café'::text,
  municipio text,
  preco text,
  variacao text,
  CONSTRAINT cotacao_diaria_cafe_pkey PRIMARY KEY (id)
);

-- notificacoes_produtor: Sistema de notificações
CREATE TABLE public.notificacoes_produtor (
  id bigint NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notificacoes_produtor_pkey PRIMARY KEY (id)
);
```

</details>
