# Integração de Anexos Compartilhados com n8n

## Visão Geral

O sistema agora suporta anexos compartilhados entre parcelas de uma mesma transação. Quando você envia um anexo via WhatsApp para uma transação parcelada, **todas as parcelas** automaticamente terão acesso ao mesmo arquivo.

## Como Funciona

### 1. Estrutura do Banco de Dados

Cada transação agora possui os seguintes campos:

- **`id_grupo_anexo`**: UUID usado para nomear o arquivo no storage
  - Para parcelas: usa o `id_transacao_pai`
  - Para transações individuais: usa o próprio `id_transacao`

- **`anexo_compartilhado_url`**: URL pública do arquivo no storage
  - Compartilhada entre todas as parcelas do mesmo grupo

- **`parcela_com_anexo_original`**: Boolean que indica qual parcela fez o upload original

- **`id_transacao_pai`**: UUID que vincula parcelas à transação original (campo já existente)

- **`numero_parcelas`**: Quantidade total de parcelas (campo já existente)

### 2. Nomenclatura de Arquivos no Storage

**Antes:**
- Cada parcela tinha seu próprio arquivo: `{id_transacao}.jpg`
- Resultado: 3 parcelas = 3 arquivos duplicados

**Agora:**
- Todas as parcelas compartilham um arquivo: `{id_grupo_anexo}.jpg`
- Resultado: 3 parcelas = 1 arquivo único

## Integração com n8n

### Cenário 1: Upload de Anexo via WhatsApp

Quando o usuário envia uma foto via WhatsApp para uma transação parcelada:

```javascript
// 1. Recebe o webhook do WhatsApp com a foto
const anexoWhatsApp = $input.item.json.media;
const mensagemTexto = $input.item.json.message;

// 2. Identifica a transação (última parcela criada, por exemplo)
const idTransacao = '...'; // ID da parcela que recebeu o anexo

// 3. Busca informações do grupo
const { data: transacao } = await supabase
  .from('transacoes_financeiras')
  .select('id_grupo_anexo, id_transacao_pai, numero_parcelas')
  .eq('id_transacao', idTransacao)
  .single();

// 4. Faz upload usando o ID do grupo (não o ID individual da parcela!)
const idArquivo = transacao.id_grupo_anexo; // Este é o ID correto!
const nomeArquivo = `${idArquivo}.jpg`;

// 5. Upload para o Supabase Storage
const { data: uploadData, error: uploadError } = await supabase
  .storage
  .from('notas_fiscais')
  .upload(nomeArquivo, arquivoBuffer, {
    contentType: 'image/jpeg',
    upsert: true // Permite sobrescrever se já existir
  });

// 6. Obtém a URL pública
const { data: urlData } = supabase
  .storage
  .from('notas_fiscais')
  .getPublicUrl(nomeArquivo);

// 7. Atualiza APENAS UMA transação do grupo (o trigger propagará para as demais)
const { error: updateError } = await supabase
  .from('transacoes_financeiras')
  .update({
    anexo_compartilhado_url: urlData.publicUrl,
    parcela_com_anexo_original: true
  })
  .eq('id_transacao', idTransacao);

// ✅ Pronto! Todas as parcelas agora têm acesso ao anexo
```

### Cenário 2: Verificar se Transação tem Anexo

```javascript
// Consulta simples - funciona para parcelas e transações individuais
const { data: transacao } = await supabase
  .from('transacoes_financeiras')
  .select('anexo_compartilhado_url, numero_parcelas')
  .eq('id_transacao', idTransacao)
  .single();

if (transacao.anexo_compartilhado_url) {
  console.log('✅ Transação tem anexo');
  console.log('URL:', transacao.anexo_compartilhado_url);

  if (transacao.numero_parcelas > 1) {
    console.log(`📎 Anexo compartilhado com ${transacao.numero_parcelas} parcelas`);
  }
} else {
  console.log('❌ Transação não tem anexo');
}
```

### Cenário 3: Buscar Todas as Parcelas de um Grupo

```javascript
// Útil para verificar consistência ou enviar notificações
const { data: parcelas } = await supabase
  .from('transacoes_financeiras')
  .select('id_transacao, parcela, anexo_compartilhado_url')
  .eq('id_grupo_anexo', idGrupoAnexo)
  .order('data_agendamento_pagamento', { ascending: true });

console.log(`Encontradas ${parcelas.length} parcelas:`);
parcelas.forEach(p => {
  console.log(`- Parcela ${p.parcela}: ${p.anexo_compartilhado_url ? '✅ com anexo' : '❌ sem anexo'}`);
});
```

## Triggers Automáticos do Banco

O banco de dados possui triggers que automatizam a propagação de anexos:

### Trigger `propagar_anexo_para_parcelas`

**Quando:** Uma transação recebe um `anexo_compartilhado_url`
**Ação:** Propaga automaticamente a URL para todas as parcelas do mesmo `id_grupo_anexo`

Isso significa que você **NÃO precisa** fazer um loop para atualizar cada parcela manualmente. Basta atualizar UMA transação do grupo!

### Trigger `limpar_anexo_ao_excluir`

**Quando:** Uma transação com anexo é excluída
**Ação:** Se for a parcela com o anexo original, marca outra parcela do grupo como tendo o anexo

Isso garante que o sistema sempre saiba qual parcela é responsável pelo arquivo no storage.

## Exemplo Completo: Workflow n8n

```json
{
  "nodes": [
    {
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp-anexo"
      }
    },
    {
      "name": "Processar Foto",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Extrai dados do WhatsApp\nconst media = $input.item.json.media;\nconst idTransacao = $input.item.json.transaction_id;\n\n// Baixa a foto do WhatsApp\nconst fotoBuffer = await fetch(media.url).then(r => r.arrayBuffer());\n\nreturn {\n  json: {\n    idTransacao,\n    fotoBuffer: Buffer.from(fotoBuffer),\n    contentType: media.mimetype\n  }\n};"
      }
    },
    {
      "name": "Buscar Grupo de Anexo",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "transacoes_financeiras",
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "keyName": "id_transacao",
              "condition": "equals",
              "keyValue": "={{ $json.idTransacao }}"
            }
          ]
        }
      }
    },
    {
      "name": "Upload Storage",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "upload",
        "bucketId": "notas_fiscais",
        "fileName": "={{ $json.id_grupo_anexo }}.jpg",
        "fileData": "={{ $json.fotoBuffer }}",
        "options": {
          "upsert": true
        }
      }
    },
    {
      "name": "Atualizar Transação",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "tableId": "transacoes_financeiras",
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "keyName": "id_transacao",
              "condition": "equals",
              "keyValue": "={{ $json.idTransacao }}"
            }
          ]
        },
        "updateFields": {
          "anexo_compartilhado_url": "={{ $json.publicUrl }}",
          "parcela_com_anexo_original": true
        }
      }
    }
  ]
}
```

## Vantagens da Nova Arquitetura

### ✅ Para o Sistema

- **Economia de espaço**: 1 arquivo ao invés de N arquivos duplicados
- **Consistência**: Todas as parcelas sempre têm a mesma versão do anexo
- **Simplicidade**: O trigger do banco faz a propagação automática
- **Retrocompatibilidade**: Transações antigas continuam funcionando

### ✅ Para o Usuário

- **Experiência melhor**: Anexa uma vez, aparece em todas as parcelas
- **Sem confusão**: Não precisa anexar o mesmo arquivo em cada parcela
- **Gestão facilitada**: Deletar o anexo remove de todas as parcelas

### ✅ Para o Desenvolvedor (n8n)

- **Menos código**: Não precisa fazer loop para atualizar parcelas
- **Menos requisições**: Uma atualização ao invés de N atualizações
- **Menos erros**: O trigger garante consistência automática

## Perguntas Frequentes

### Como sei se uma transação é parcelada?

```javascript
if (transacao.numero_parcelas > 1 || transacao.id_transacao_pai) {
  console.log('É uma transação parcelada');
}
```

### E se eu atualizar apenas uma parcela?

O trigger do banco automaticamente propagará para as demais. Não é necessário fazer nada extra!

### Como excluir um anexo compartilhado?

```javascript
// 1. Excluir arquivo do storage
await supabase
  .storage
  .from('notas_fiscais')
  .remove([`${id_grupo_anexo}.jpg`]);

// 2. Limpar URL de UMA transação (trigger limpará as demais)
await supabase
  .from('transacoes_financeiras')
  .update({ anexo_compartilhado_url: null })
  .eq('id_transacao', idTransacao);
```

### E transações antigas sem `id_grupo_anexo`?

A migration inicializa automaticamente o campo:
- Parcelas: recebem o `id_transacao_pai`
- Individuais: recebem o próprio `id_transacao`

O sistema é 100% retrocompatível!

## Suporte

Para dúvidas ou problemas, consulte:
- Logs do Supabase: `supabase.storage.from('notas_fiscais').list()`
- Logs do banco: Verifique os triggers `propagar_anexo_para_parcelas` e `limpar_anexo_ao_excluir`
- Service auxiliar: Use `SharedAttachmentService` para debugging

---

**Última atualização:** 2025-10-06
**Versão da Migration:** `add_shared_attachment_fields`
