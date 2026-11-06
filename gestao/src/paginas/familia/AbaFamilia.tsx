// Aba Família da página do aluno: os responsáveis (que se cadastraram na página de cadastro da escola), os recados
// para a família (separados das observações internas) e a exceção do que a família vê deste aluno. A API decide quem pode o quê; a tela só esconde.
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Divider, IconButton, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Popup from '../../components/Popup';
import Secao from '../../components/Secao';
import { ErroLista } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useCarregar } from '../../lib/useCarregar';
import { dataCurta } from '../../lib/formato';
import { RELATORIOS_FAMILIA } from '../../lib/familia';
import DadosDeAcesso, { Acesso } from '../usuarios/DadosDeAcesso';
import { senhaAleatoria } from '../usuarios/senha';
import PopupTrocarPin from './area/PopupTrocarPin';
import type { RecadoFamilia, RelatorioFamilia, ResponsaveisDoAluno, VisivelFamiliaAluno } from '../../types';

interface Props { alunoId: string; nome: string; pode: boolean }

export default function AbaFamilia({ alunoId, nome, pode }: Props) {
  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start', pb: 4 }}>
      <Stack spacing={2.5}>
        {pode && <Responsaveis alunoId={alunoId} nome={nome} />}
        <Recados alunoId={alunoId} pode={pode} />
      </Stack>
      <OQueAFamiliaVe alunoId={alunoId} />
    </Box>
  );
}

// ---------- responsáveis ----------

function Responsaveis({ alunoId, nome }: { alunoId: string; nome: string }) {
  const { dados, erro, recarregar } = useCarregar<ResponsaveisDoAluno>(`/alunos/${alunoId}/responsaveis`);
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [trocandoPin, setTrocandoPin] = useState(false);

  // a senha atual nunca aparece: a equipe dá uma provisória (mostrada uma vez) e o responsável cria a dele ao entrar
  const redefinirSenha = async (r: ResponsaveisDoAluno['responsaveis'][number]) => {
    if (!(await confirmar({ titulo: `Dar uma senha nova para ${r.nome}?`, botao: 'Gerar senha provisória',
      texto: 'A senha atual deixa de valer. Você passa a senha provisória para a pessoa, e no próximo acesso ela cria a própria senha.' }))) return;
    const senha = senhaAleatoria();
    try {
      await api(`/alunos/${alunoId}/responsaveis/${r.id}/senha`, { metodo: 'PUT', corpo: { senha } });
      setAcesso({ titulo: 'Senha provisória do responsável', nome: r.nome, email: r.email, senha });
    } catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  const desvincular = async (r: ResponsaveisDoAluno['responsaveis'][number]) => {
    if (!(await confirmar({ titulo: `Tirar ${r.nome} de ${nome}?`, botao: 'Tirar o acesso', perigo: true,
      texto: 'A pessoa deixa de ver este aluno na área da família. A conta dela continua (e os outros filhos, se houver).' }))) return;
    try { await api(`/alunos/${alunoId}/responsaveis/${r.id}`, { metodo: 'DELETE' }); avisar('Acesso retirado.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <Secao titulo="Responsáveis" subtitulo="Quem acompanha o aluno pela área da família."
      acao={dados?.pode_redefinir_pin ? <Button onClick={() => setTrocandoPin(true)} sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>🔢 Redefinir PIN</Button> : undefined}>
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!erro && !dados && <Skeleton variant="rounded" height={80} />}
      {dados && !dados.responsaveis.length && (
        <Typography color="text.secondary">Ninguém da família ainda. A família se cadastra pela página de cadastro (menu <b>Família</b>).</Typography>
      )}
      {dados && (
        <Stack divider={<Divider />}>
          {dados.responsaveis.map((r) => (
            <Box key={r.id} sx={{ py: 1.25, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography fontWeight={800}>{r.nome}</Typography>
                  {r.parentesco && <Chip size="small" variant="outlined" label={r.parentesco} />}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                  {r.email}{r.consentimento_em ? ` · autorizou (LGPD) em ${dataCurta(r.consentimento_em)}` : ''}
                </Typography>
              </Box>
              {dados.pode_redefinir_senha && (
                <Tooltip title="Dar uma senha provisória"><IconButton aria-label={`Dar uma senha provisória para ${r.nome}`} onClick={() => redefinirSenha(r)}><VpnKeyIcon /></IconButton></Tooltip>
              )}
              {dados.pode_desvincular && (
                <Tooltip title="Tirar o acesso"><IconButton aria-label={`Tirar o acesso de ${r.nome}`} onClick={() => desvincular(r)}><LinkOffIcon /></IconButton></Tooltip>
              )}
            </Box>
          ))}
        </Stack>
      )}
      <DadosDeAcesso acesso={acesso} aoFechar={() => setAcesso(null)} />
      <PopupTrocarPin filho={trocandoPin ? { id: alunoId, nome } : null} rota={`/alunos/${alunoId}/pin`} aoFechar={() => setTrocandoPin(false)} />
    </Secao>
  );
}

// ---------- recados para a família ----------

function Recados({ alunoId, pode }: { alunoId: string; pode: boolean }) {
  const { dados, erro, recarregar } = useCarregar<RecadoFamilia[]>(`/alunos/${alunoId}/recados`);
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [popup, setPopup] = useState<{ aberto: boolean; recado: RecadoFamilia | null }>({ aberto: false, recado: null });

  const apagar = async (r: RecadoFamilia) => {
    if (!(await confirmar({ titulo: 'Apagar este recado?', botao: 'Apagar', perigo: true, texto: 'Ele some também da área da família.' }))) return;
    try { await api(`/recados/${r.id}`, { metodo: 'DELETE' }); avisar('Recado apagado.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <Secao titulo="Recados para a família" subtitulo="A família lê na área dela. Para anotações da equipe, use Observações."
      acao={pode ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPopup({ aberto: true, recado: null })}>Novo recado</Button> : undefined}>
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!erro && !dados && <Skeleton variant="rounded" height={80} />}
      {dados && !dados.length && <Typography color="text.secondary">Nenhum recado ainda.</Typography>}
      {dados && dados.length > 0 && (
        <Stack divider={<Divider />}>
          {dados.map((r) => (
            <Box key={r.id} sx={{ py: 1.25, display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary">{dataCurta(r.criado_em)} · {r.autor_nome}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{r.texto}</Typography>
              </Box>
              {r.pode_editar && (
                <Stack direction="row" sx={{ alignSelf: 'flex-start' }}>
                  <Tooltip title="Corrigir"><IconButton aria-label="Corrigir o recado" onClick={() => setPopup({ aberto: true, recado: r })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Apagar"><IconButton aria-label="Apagar o recado" onClick={() => apagar(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}
      <PopupRecado aberto={popup.aberto} recado={popup.recado} alunoId={alunoId} aoFechar={() => setPopup({ aberto: false, recado: null })}
        aoSalvar={(novo) => { setPopup({ aberto: false, recado: null }); avisar(novo ? 'Recado enviado para a família.' : 'Recado corrigido.'); recarregar(); }} />
    </Secao>
  );
}

function PopupRecado({ aberto, recado, alunoId, aoFechar, aoSalvar }:
  { aberto: boolean; recado: RecadoFamilia | null; alunoId: string; aoFechar: () => void; aoSalvar: (novo: boolean) => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (aberto) { setTexto(recado?.texto || ''); setErro(''); } }, [aberto, recado]);

  const salvar = async () => {
    if (texto.trim().length < 3) { setErro('Escreva o recado.'); ref.current?.focus(); return; }
    setSalvando(true); setErro('');
    try {
      if (recado) await api(`/recados/${recado.id}`, { metodo: 'PUT', corpo: { texto: texto.trim() } });
      else await api(`/alunos/${alunoId}/recados`, { metodo: 'POST', corpo: { texto: texto.trim() } });
      aoSalvar(!recado);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo={recado ? 'Corrigir recado' : 'Novo recado para a família'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={recado ? 'Salvar' : 'Enviar'} salvando={salvando} erro={erro}>
      <Stack spacing={2}>
        <Alert severity="info" icon={false}>A família lê este recado. Não escreva aqui o que é só da equipe.</Alert>
        <TextField label="Recado" multiline minRows={5} value={texto} onChange={(e) => setTexto(e.target.value)} inputRef={ref}
          error={!!erro && texto.trim().length < 3} autoFocus inputProps={{ maxLength: 4000 }} helperText={`${texto.length}/4000`}
          placeholder="Ex.: Amanhã tem passeio. Mandar boné e garrafinha de água." />
      </Stack>
    </Popup>
  );
}

// ---------- exceção do que a família vê ----------

const valorDaExcecao = (v: boolean | undefined) => (v === true ? 'sim' : v === false ? 'nao' : '');

function OQueAFamiliaVe({ alunoId }: { alunoId: string }) {
  const { dados, erro, recarregar } = useCarregar<VisivelFamiliaAluno>(`/alunos/${alunoId}/visivel-familia`);
  const avisar = useAvisos();
  const [atual, setAtual] = useState<VisivelFamiliaAluno | null>(null);
  const [gravando, setGravando] = useState(false);
  const v = atual || dados;

  const mudar = async (chave: RelatorioFamilia, valor: string) => {
    setGravando(true);
    try {
      const r = await api<VisivelFamiliaAluno>(`/alunos/${alunoId}/visivel-familia`, { metodo: 'PUT',
        corpo: { [chave]: valor === 'sim' ? true : valor === 'nao' ? false : null } });
      setAtual(r);
      avisar('Salvo.');
    } catch (e) { avisar(mensagemDoErro(e), 'error'); } finally { setGravando(false); }
  };

  return (
    <Secao titulo="O que a família vê deste aluno" subtitulo="Por padrão segue a regra da escola (menu Família).">
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!erro && !v && <Skeleton variant="rounded" height={200} />}
      {v && (
        <Stack spacing={2}>
          {RELATORIOS_FAMILIA.map((r) => (
            <Box key={r.chave}>
              <TextField select fullWidth label={r.titulo} value={valorDaExcecao(v.excecao[r.chave])} disabled={!v.pode_mudar || gravando}
                SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                onChange={(e) => mudar(r.chave, e.target.value)}>
                <MenuItem value="">Seguir a regra ({v.regra[r.chave] ? 'mostra' : 'não mostra'})</MenuItem>
                <MenuItem value="sim">Mostrar para esta família</MenuItem>
                <MenuItem value="nao">Não mostrar para esta família</MenuItem>
              </TextField>
              <Typography variant="body2" color={v.efetivo[r.chave] ? 'success.main' : 'text.secondary'} sx={{ mt: 0.5, ml: 0.5 }}>
                {v.efetivo[r.chave] ? '✓ A família vê' : '— A família não vê'}
              </Typography>
            </Box>
          ))}
          {!v.pode_mudar && <Alert severity="info">Quem muda o que a família vê é a coordenação.</Alert>}
          <Typography variant="body2" color="text.secondary">Observações internas nunca aparecem para a família.</Typography>
        </Stack>
      )}
    </Secao>
  );
}
