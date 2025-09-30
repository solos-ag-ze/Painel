# Estrutura da Tabela cotacao_diaria_cafe

## Tabela: `cotacao_diaria_cafe`

Esta tabela armazena as cotações diárias do café no Supabase.

### Estrutura Real (baseada na imagem fornecida):

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `id` | int8 | Identificador único (PK) | 1 |
| `cultura` | text | Tipo de cultura | "Café" |
| `municipio` | text | Município de referência | "Guaxupé/MG (Cooxupé)" |
| `preco` | text | Preço formatado em R$ | "R$1.959,00" |
| `variacao` | text | Variação percentual | "+1,03" |

### Como está sendo usado no código:

```typescript
// Busca o preço do registro com ID = 1
const { data, error } = await supabase
  .from('cotacao_diaria_cafe')
  .select('preco')
  .eq('id', 1)
  .single();

// Converte "R$1.959,00" para número 1959
const precoNumerico = CotacaoService.parsePrecoString(data.preco);
```

### Exemplo de dados reais (baseado na imagem):

```sql
-- Registro principal (ID = 1)
INSERT INTO cotacao_diaria_cafe (id, cultura, municipio, preco, variacao) 
VALUES (1, 'Café', 'Guaxupé/MG (Cooxupé)', 'R$1.959,00', '+1,03');
```

### Observações:

1. **ID 1 é especial**: O sistema sempre busca a cotação do registro com `id = 1`
2. **Valor padrão**: Se não encontrar ou houver erro, usa R$ 1.726,00
3. **Formato do preço**: Vem como string formatada (ex: "R$1.959,00")
4. **Conversão**: O sistema converte automaticamente para número (1959)
5. **Variação**: Também vem como string ("+1,03") e é convertida para exibição

### Funções de conversão implementadas:

```typescript
// Converte "R$1.959,00" → 1959
CotacaoService.parsePrecoString(precoString)

// Converte "+1,03" → 1.03
CotacaoService.parseVariacaoString(variacaoString)
```

### Para verificar os dados atuais:

```sql
SELECT * FROM cotacao_diaria_cafe WHERE id = 1;
```