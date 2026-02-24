import { useEffect, useState } from 'react';
import { X, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  HistoricoAtividadesService,
  HistoricoEdicaoAtividadeFormatado,
} from '../../services/historicoAtividadesService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import { formatDateBR, parseDateFromDB } from '../../lib/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  atividadeId: string;
}

export default function ActivityHistoricoModal({ isOpen, onClose, atividadeId }: Props) {
  const [historico, setHistorico] = useState<HistoricoEdicaoAtividadeFormatado[]>([]);
  const [loading, setLoading] = useState(false);
  const [talhaoNames, setTalhaoNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && atividadeId) {
      loadHistorico();
    }
  }, [isOpen, atividadeId]);

  const loadHistorico = async () => {
    setLoading(true);
    try {
      console.log('[ActivityHistoricoModal] loadHistorico start', { atividadeId });
      const dados = await HistoricoAtividadesService.getHistoricoFormatado(atividadeId);
      console.log('[ActivityHistoricoModal] historico rows fetched (formatted)', { atividadeId, count: Array.isArray(dados) ? dados.length : 0 });
      setHistorico(dados);

      // Também buscar os registros brutos para coletar snapshots completos
      let rawHistorico: any[] = [];
      try {
        rawHistorico = await HistoricoAtividadesService.getHistoricoByAtividade(atividadeId);
        console.log('[ActivityHistoricoModal] historico rows fetched (raw)', { atividadeId, count: rawHistorico.length });
      } catch (e) {
        console.log('[ActivityHistoricoModal] erro ao buscar historico raw', e);
      }
      // coletar ids de talhões presentes nos snapshots e carregar nomes
      const ids = new Set<string>();
      // iterar tanto pelos registros formatados (que podem conter dadosAtividade em criações/confirm.)
      // quanto pelos registros brutos para garantir que todos os snapshots (edicoes) sejam cobertos.
      const registrosParaScan = [] as any[];
      registrosParaScan.push(...(dados || []));
      registrosParaScan.push(...(rawHistorico || []));

      for (const registro of registrosParaScan) {
        try {
          console.log('[ActivityHistoricoModal] scanning registro for talhao ids', { registroId: registro.id, markerCriacao: registro.isCriacao, markerConfirmacao: registro.isConfirmacao });
        } catch (e) {
          // ignore logging error
        }

        // registros formatados podem ter estrutura diferente (dadosAtividade)
        const snapshotFromFormatted = (registro.dadosAtividade as any)?.dados_novos ?? registro.dadosAtividade;
        const snapshot = snapshotFromFormatted ?? registro.dados_novos ?? registro.dados_anteriores ?? registro;
        if (!snapshot) continue;
        // coletar ids das diferentes formas possíveis: talhoes (obj), lancamento_talhoes, talhao_ids (array de ids)
        const arrCandidates = [] as any[];
        const pushCandidatesFrom = (val: unknown) => {
          if (val == null) return;
          // se for string JSON que representa array/obj, tentar parsear
          if (typeof val === 'string') {
            const s = val.trim();
            if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
              try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) arrCandidates.push(...parsed);
                else arrCandidates.push(parsed);
                return;
              } catch (e) {
                // não conseguiu parsear, fallback para usar string como id
                arrCandidates.push(val);
                return;
              }
            }
            // string simples - pode ser id único
            arrCandidates.push(val);
            return;
          }
          if (Array.isArray(val)) arrCandidates.push(...val);
          else arrCandidates.push(val);
        };

        pushCandidatesFrom(snapshot['talhoes']);
        pushCandidatesFrom(snapshot['lancamento_talhoes']);
        pushCandidatesFrom(snapshot['talhao_ids']);
        // também aceitar chave comum 'id_talhoes' ou 'id_talho' caso venha como alternativa
        pushCandidatesFrom(snapshot['id_talhoes']);

        if (Array.isArray(arrCandidates) && arrCandidates.length > 0) {
          console.log('[ActivityHistoricoModal] found talhao candidate array', { registroId: registro.id, candidateCount: arrCandidates.length, sample: arrCandidates.slice(0,3) });
          for (const it of arrCandidates) {
            if (!it) continue;
            // se for string simples (id)
            if (typeof it === 'string') {
              ids.add(it);
              console.log('[ActivityHistoricoModal] added talhao id (string)', { registroId: registro.id, id: it });
              continue;
            }
            // possíveis chaves onde o id pode aparecer
            const id = it?.talhao_id || it?.id_talhao || it?.talhao || it?.id || it?.talho_id;
            if (id && typeof id === 'string') {
              ids.add(id);
              console.log('[ActivityHistoricoModal] added talhao id (from object)', { registroId: registro.id, id });
            } else if (typeof it === 'object') {
              // tentar detectar se objeto inteiro é na verdade um id dentro de uma chave inesperada
              const vs = Object.values(it).filter((v: any) => typeof v === 'string');
              if (vs.length > 0) {
                // priorizar talhao_id-like values
                const possible = vs.find((v: string) => /[0-9a-fA-F\-]{8,}/.test(v));
                if (possible) {
                  ids.add(possible);
                  console.log('[ActivityHistoricoModal] heuristically added talhao id (from object values)', { registroId: registro.id, id: possible });
                }
              }
            }
          }
        }
      }
      if (ids.size > 0) {
        console.log('[ActivityHistoricoModal] total unique talhao ids collected', { count: ids.size, ids: Array.from(ids).slice(0,50) });
        const idList = Array.from(ids);
        const { data: rows, error } = await supabase
          .from('talhoes')
          .select('id_talhao, nome')
          .in('id_talhao', idList);

        if (!error && rows) {
          console.log('[ActivityHistoricoModal] talhoes select returned rows', { rowsCount: rows.length });
          const map: Record<string, string> = {};
          for (const r of rows) {
            const idKey = (r as any).id_talhao ?? null;
            if (idKey) map[String(idKey)] = (r as any).nome;
          }
          setTalhaoNames((prev) => ({ ...prev, ...map }));

          // log IDs que ficaram faltando (para debugging)
          try {
            const notFound = idList.filter((id) => !map[id]);
            if (notFound.length > 0) {
              console.log('[ActivityHistoricoModal] talhao ids não encontrados no select, tentando fallback', { notFound });
              // tentar buscar novamente, incluindo possíveis colunas alternativas
              try {
                const { data: extraRows, error: extraErr } = await supabase
                  .from('talhoes')
                  .select('id_talhao, id, nome')
                  .in('id_talhao', notFound);
                if (!extraErr && extraRows) {
                  console.log('[ActivityHistoricoModal] fallback extraRows returned', { count: extraRows.length });
                  const extraMap: Record<string, string> = {};
                  for (const r of extraRows) {
                    const idKey = (r as any).id_talhao ?? null;
                    if (idKey) extraMap[String(idKey)] = (r as any).nome;
                  }
                  if (Object.keys(extraMap).length > 0) {
                    setTalhaoNames((prev) => ({ ...prev, ...extraMap }));
                  }
                  // recomputar notFound
                  const stillMissing = notFound.filter((id) => !extraMap[id] && !map[id]);
                  // como último recurso, consultar individualmente
                  for (const missingId of stillMissing) {
                    try {
                      const { data: singleRow, error: singleErr } = await supabase
                        .from('talhoes')
                        .select('id_talhao, id, nome')
                        .eq('id_talhao', missingId)
                        .maybeSingle();
                      if (!singleErr && singleRow) {
                        const singleKey = (singleRow as any).id_talhao ?? null;
                        if (singleKey) setTalhaoNames((prev) => ({ ...prev, [String(singleKey)]: (singleRow as any).nome }));
                        else console.log('[ActivityHistoricoModal] talhao singleRow sem id_talhao:', { singleRow });
                      } else {
                        console.log('[ActivityHistoricoModal] talhao id ainda não encontrado (single):', { missingId });
                      }
                    } catch (e) {
                      console.log('[ActivityHistoricoModal] erro no fallback individual para talhao id:', { missingId, error: e });
                    }
                  }
                } else if (extraErr) {
                  console.debug('[ActivityHistoricoModal] erro no fallback extra talhoes:', extraErr);
                }
              } catch (e) {
                console.debug('[ActivityHistoricoModal] excecao no fallback talhoes:', e);
              }
                } else {
              console.log('[ActivityHistoricoModal] all talhao ids resolved by initial select');
            }
          } catch (e) {
            console.log('[ActivityHistoricoModal] erro ao processar notFound:', e);
          }
        } else if (error) {
          console.error('Erro ao buscar nomes de talhões:', error);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar histórico de atividade:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDataHora = (data: Date): string => {
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDados = (dados: Record<string, unknown>) => {
    const capitalizeFirst = (s: string) => {
      if (!s) return s;
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const capitalizeLines = (s: string) => {
      if (!s) return s;
      return s.split('\n').map(l => capitalizeFirst(l.trim())).join('\n');
    };
    // Exibir apenas os campos na ordem solicitada
    const getDescricao = () => {
      return (
        (dados['nome_atividade'] as string) ||
        (dados['descricao'] as string) ||
        (dados['raw_text'] as string) ||
        ''
      );
    };

    const getDataAtividade = () => {
      const raw = (dados['data_atividade'] as string) || (dados['data'] as string) || '';
      if (!raw) return '';
      try {
        const d = parseDateFromDB(String(raw));
        return d ? formatDateBR(d) : String(raw);
      } catch (e) {
        return String(raw);
      }
    };

    const getTalhoes = () => {
      const t = dados['talhoes'] ?? dados['lancamento_talhoes'] ?? dados['talhao_ids'] ?? dados['talhao'] ?? dados['id_talhoes'] ?? null;
      const area = dados['area_atividade'] ?? dados['area'] ?? '';

      // Se veio como array vazio ou string representando array vazio, fallback para area
      if (Array.isArray(t)) {
        if (t.length === 0) {
          return String(area || '-');
        }
        return (t as any[]).map(x => {
          // se item já contém nome
          if (x && typeof x === 'object' && x.nome) return x.nome;
          // se for string id
          if (typeof x === 'string' && talhaoNames[x]) return talhaoNames[x];
          // se for objeto com id referenciando talhão
          const id = x?.talhao_id || x?.id_talhao || x?.talhao || x?.id || x?.talho_id;
          if (id && talhaoNames[id]) return talhaoNames[id];
          // fallback para representação simples
          if (typeof x === 'string') return x;
          return String(x);
        }).join(', ');
      }

      if (typeof t === 'string' && t.trim().length > 0) {
        // pode ser JSON string contendo array de ids ou objetos
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) return String(area || '-');
            return parsed.map((x: any) => {
              if (typeof x === 'string' && talhaoNames[x]) return talhaoNames[x];
              if (x && x.nome) return x.nome;
              return String(x);
            }).join(', ');
          }
        } catch (e) {
          // não é JSON
        }
        // se for um id único
        if (talhaoNames[t]) return talhaoNames[t];
        return String(t);
      }

      return String(area || '-');
    };

    const getResponsaveis = () => {
      const r = dados['responsaveis'] || dados['lancamento_responsaveis'] || '';
      if (!r) return '';
      if (Array.isArray(r)) {
        const names = (r as any[]).map((x) => {
          if (x == null) return '';
          if (typeof x === 'string' || typeof x === 'number') return String(x);
          // possíveis chaves para nome
          const possible = [
            'nome',
            'name',
            'full_name',
            'nome_responsavel',
            'responsavel',
          ];
          for (const k of possible) {
            if (k in x && x[k]) return String(x[k]);
          }
          // nested patterns
          if (x.user && x.user.nome) return String(x.user.nome);
          if (x.usuario && x.usuario.nome) return String(x.usuario.nome);
          if (x.pessoa && x.pessoa.nome) return String(x.pessoa.nome);
          // fallback: try to stringify a name-like value
          const vals = Object.values(x).filter(v => typeof v === 'string' && v.length > 0);
          if (vals.length > 0) return String(vals[0]);
          return '';
        }).filter(Boolean);
        return names.join(', ');
      }
      return String(r);
    };

    const getProdutos = () => {
      const p = dados['produtos'] || dados['lancamento_produtos'] || [];
      if (!p) return '';
      if (Array.isArray(p)) {
        return (p as any[]).map((it) => {
          const nome = it.nome_produto || it.nome || it.nome_do_produto || '';
            const q = (it.quantidade_val ?? it.quantidade) || '';
          const un = it.quantidade_un || it.unidade || '';
          const dose = it.dose_val ? ` · ${it.dose_val} ${it.dose_un ?? ''}` : '';
          return `${nome}${q ? ` — ${q} ${un}` : ''}${dose}`;
        }).filter(Boolean).join('\n');
      }
      return String(p);
    };

    const getMaquinas = () => {
      const m = dados['maquinas'] || dados['lancamento_maquinas'] || [];
      if (!m) return '';
      if (Array.isArray(m)) {
        return (m as any[]).map((it) => {
          const nome = it.nome_maquina || it.nome || '';
          const horas = it.horas_maquina ?? it.horas ?? '';
          return `${nome}${horas ? ` — ${horas} h` : ''}`;
        }).filter(Boolean).join('\n');
      }
      return String(m);
    };

    const getObservacoes = () => {
      return (dados['observacao'] as string) || (dados['observacoes'] as string) || '';
    };

    const rows = [
      { label: 'Descrição', value: getDescricao() },
      { label: 'Data da atividade', value: getDataAtividade() },
      { label: 'Talhões vinculados', value: getTalhoes() },
      { label: 'Responsáveis', value: getResponsaveis() },
      { label: 'Produtos utilizados', value: getProdutos() },
      { label: 'Máquinas utilizadas', value: getMaquinas() },
      { label: 'Observações', value: getObservacoes() },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        { rows.map((r) => (
            <div key={r.label} className="bg-white rounded-md p-2 border border-gray-100">
              <p className="text-xs text-gray-500">{r.label}</p>
              <div className="text-sm font-medium text-[#004417] whitespace-pre-wrap">{capitalizeLines(String(r.value || '-'))}</div>
            </div>
          ))}
      </div>
    );
  };

  const formatAlteracaoValue = (val: unknown, campo?: string) => {
    if (val === null || val === undefined || val === '') return '-';

    // Se veio como string JSON (ex: '["id1"]' ou '{"talhao_id":"..."}'), tentar parsear
    if (typeof val === 'string') {
      const s = val.trim();
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
          const parsed = JSON.parse(s);
          // usar o fluxo normal convertendo o valor
          return formatAlteracaoValue(parsed as any, campo);
        } catch (e) {
          // se parse falhar, continua com a string original
          // mas logamos para debug
          console.log('[ActivityHistoricoModal] formatAlteracaoValue: json parse failed, using raw string', { value: s, campo });
        }
      }
    }

    const tryGetName = (it: any) => {
      if (!it) return null;
      if (typeof it === 'string' || typeof it === 'number') return String(it);
      if (it.nome) return String(it.nome);
      if (it.nome_maquina) return String(it.nome_maquina);
      if (it.name) return String(it.name);
      if (it.nome_produto) return String(it.nome_produto);
      if (it.nome_do_produto) return String(it.nome_do_produto);
      if (it.usuario && it.usuario.nome) return String(it.usuario.nome);
      // fallback to first string value
      const vs = Object.values(it).filter((v: any) => typeof v === 'string' && v.length > 0);
      if (vs.length > 0) return String(vs[0]);
      return JSON.stringify(it);
    };

    // Arrays
    if (Array.isArray(val)) {
      // responsaveis
      if (campo && campo.toLowerCase().includes('respons')) {
        const names = (val as any[]).map((it) => tryGetName(it)).filter(Boolean);
        return names.join(', ') || '-';
      }
      // produtos
      if (campo && campo.toLowerCase().includes('produt')) {
        const prods = (val as any[]).map((it) => {
          const nome = tryGetName(it) || '';
          const q = (it?.quantidade_val ?? it?.quantidade ?? it?.quantidade_total_usada) || '';
          const u = it?.quantidade_un ?? it?.unidade ?? it?.unidade_medida ?? '';
          return `${nome}${q ? ` — ${q} ${u}` : ''}`.trim();
        }).filter(Boolean);
        return prods.join('\n') || '-';
      }
      // maquinas
      if (campo && campo.toLowerCase().includes('maquin')) {
        const maquinas = (val as any[]).map((it) => {
          const nome = it.nome_maquina || it.nome || tryGetName(it) || '';
          const horas = it.horas_maquina ?? it.horas ?? '';
          return `${nome}${horas ? ` — ${horas} h` : ''}`.trim();
        }).filter(Boolean);
        return maquinas.join('\n') || '-';
      }
      // talhoes
      if (campo && campo.toLowerCase().includes('talh')) {
        const names = (val as any[]).map((it) => {
          if (!it) return null;
          if (it.nome) return it.nome;
          const id = it?.talhao_id ?? it?.id_talhao ?? it?.id ?? null;
          if (id && talhaoNames[id]) return talhaoNames[id];
          return tryGetName(it);
        }).filter(Boolean);
        return names.join(', ') || '-';
      }
      // generic array -> join stringified items
      return (val as any[]).map((it) => tryGetName(it) ?? String(it)).join(', ');
    }

    // object
    if (typeof val === 'object') {
      // se for um objeto talhao simples contendo id
      try {
        if (campo && campo.toLowerCase().includes('talh')) {
          const id = (val as any)?.talhao_id ?? (val as any)?.id_talhao ?? (val as any)?.id ?? null;
          if (id && talhaoNames[id]) {
            console.log('[ActivityHistoricoModal] mapping object talhao id -> name in formatAlteracaoValue', { id, name: talhaoNames[id] });
            return talhaoNames[id];
          }
        }
      } catch (e) {
        // ignore
      }
      return tryGetName(val) ?? JSON.stringify(val);
    }

    // single string talhao id -> map to name
    if (campo && campo.toLowerCase().includes('talh') && (typeof val === 'string' || typeof val === 'number')) {
      const s = String(val);
      if (talhaoNames[s]) {
        console.log('[ActivityHistoricoModal] mapping single talhao id -> name in formatAlteracaoValue', { id: s, name: talhaoNames[s] });
        return talhaoNames[s];
      }
    }

    return String(val);
  };

  const mapCampoLabel = (campo?: string) => {
    if (!campo) return '';
    const key = String(campo).toLowerCase();
    // Mapear campos técnicos para rótulos legíveis/acentuados
    switch (key) {
      case 'talhoes':
      case 'talhao':
      case 'id_talhoes':
      case 'talhao_ids':
        return 'Talhões';
      case 'observacoes':
      case 'observacao':
        return 'Observações';
      case 'descricao':
      case 'nome_atividade':
        return 'Descrição';
      case 'produtos':
      case 'lancamento_produtos':
        return 'Produtos';
      case 'maquinas':
      case 'lancamento_maquinas':
        return 'Máquinas';
      case 'responsaveis':
      case 'lancamento_responsaveis':
        return 'Responsáveis';
      default:
        // capitalizar a primeira letra para casos genéricos
        return String(campo).charAt(0).toUpperCase() + String(campo).slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#004417]">Histórico da Atividade</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
            ) : historico.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Esta atividade não possui histórico</p>
              </div>
            ) : (
              <div className="space-y-6">
                {historico.map((registro, idx) => (
                  <div key={registro.id} className="relative">
                    {idx < historico.length - 1 && (
                      <div className="absolute left-[15px] top-[40px] w-[2px] h-[calc(100%+24px)] bg-gray-200" />
                    )}
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 ${registro.isConfirmacao ? 'bg-[#86b646]' : registro.isCriacao ? 'bg-[#25D366]' : 'bg-[#00A651]'} rounded-full flex items-center justify-center relative z-10`}> 
                        {registro.isCriacao ? (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        ) : registro.isConfirmacao ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-[#004417]">
                            {registro.isCriacao ? 'Lançado' : registro.isConfirmacao ? 'Confirmado' : 'Editado'} em {formatDataHora(registro.editadoEm)}
                          </p>
                        </div>
                        {registro.isConfirmacao && registro.dadosAtividade ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Atividade confirmada:</p>
                            {renderDados((registro.dadosAtividade as any)?.dados_novos ?? registro.dadosAtividade)}
                          </div>
                        ) : registro.isCriacao && registro.dadosAtividade ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Registro inicial:</p>
                            {renderDados((registro.dadosAtividade as any)?.dados_novos ?? registro.dadosAtividade)}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {registro.alteracoes.map((alt, i) => (
                              <div key={i} className="bg-white rounded-md p-3 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{mapCampoLabel(alt.campo)}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600 line-through">{formatAlteracaoValue(alt.valorAnterior, alt.campo)}</span>
                                  <ArrowRight className="w-4 h-4 text-[#00A651] flex-shrink-0" />
                                  <span className="text-[#004417] font-semibold">{formatAlteracaoValue(alt.valorNovo, alt.campo)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end p-6 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-white bg-[#00A651] rounded-lg hover:bg-[#00A651]/90 transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </>
  );
}
