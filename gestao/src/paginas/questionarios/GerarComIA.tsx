// "Gerar com IA": o professor fotografa (ou escolhe da galeria) as páginas do exercício, ou manda um PDF, e a IA
// gratuita da API (Gemini, com Groq de reserva) devolve as perguntas no formato da planilha. Elas voltam para o editor
// e passam pela mesma revisão da importação: nada é salvo sem o professor conferir. A foto é reduzida aqui no
// navegador (lado maior 1600 px, JPEG) antes de enviar: sobe mais rápido e cabe na cota grátis. Nada fica guardado.
import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, LinearProgress, MenuItem, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Popup from '../../components/Popup';
import { api, ErroApi, EVENTO_SESSAO_EXPIRADA, guardarToken, lerEscolaDoAdmin, lerToken, mensagemDoErro } from '../../lib/api';
import { PerguntaQuiz } from './planilha';

interface Material { id: number; nome: string; tipo: 'foto' | 'pdf'; dados: string; previa?: string }
interface StatusIA { configurada: boolean; falsa?: boolean; limite: number; restantes: number }
interface Props { aberto: boolean; aoFechar: () => void; aoGerar: (perguntas: PerguntaQuiz[], nome: string) => void }

const MAX_ARQUIVOS = 6;
const MAX_PDF = 10 * 1024 * 1024;
const LADO_MAIOR = 1600;
const MATERIAS = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Outra'];

// O progresso que a tela mostra: o envio é real (bytes que já subiram); depois, a IA não diz em que etapa está, então
// as etapas seguem o tempo de costume e a barra anda cada vez mais devagar até 95% (nunca fica parada nem chega a
// 100% antes da resposta). O relógio mostra que continua vivo.
type Fase = 'enviando' | 'ia' | 'pronto';
interface Progresso { fase: Fase; enviado: number; total: number; inicioIA: number }

const mb = (n: number) => (n / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// o envio pelo XMLHttpRequest (o fetch não informa quanto já subiu); mesmas regras do api() de lib/api.ts
function enviarComProgresso<T>(caminho: string, corpo: unknown, aoEnviar: (enviado: number, total: number) => void, aoTerminarEnvio: () => void, guardarXhr: (x: XMLHttpRequest) => void): Promise<T> {
  return new Promise((ok, falha) => {
    const xhr = new XMLHttpRequest();
    guardarXhr(xhr);
    xhr.open('POST', `/api${caminho}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    const token = lerToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (token && lerEscolaDoAdmin()) xhr.setRequestHeader('X-Escola', lerEscolaDoAdmin());
    xhr.timeout = 5 * 60 * 1000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) aoEnviar(e.loaded, e.total); };
    xhr.upload.onload = aoTerminarEnvio;
    xhr.onload = () => {
      let dados: { message?: string; codigo?: string } = {};
      try { dados = JSON.parse(xhr.responseText); } catch { /* sem JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) return ok(dados as T);
      if (xhr.status === 401 && token) { guardarToken(''); window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA)); }
      falha(new ErroApi(dados.message || 'Não deu certo. Tente de novo.', xhr.status, dados.codigo || ''));
    };
    xhr.onerror = () => falha(new ErroApi(navigator.onLine ? 'O servidor não respondeu. Tente de novo em instantes.' : 'Sem internet agora. Tente de novo quando a conexão voltar.'));
    xhr.ontimeout = () => falha(new ErroApi('A IA demorou demais para responder. Tente de novo (ou com menos páginas).'));
    xhr.onabort = () => falha(new ErroApi('Geração cancelada.', 0, 'cancelado'));
    xhr.send(JSON.stringify(corpo));
  });
}

function Etapa({ estado, texto, detalhe }: { estado: 'feita' | 'agora' | 'depois'; texto: string; detalhe?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75, opacity: estado === 'depois' ? 0.5 : 1 }}>
      {estado === 'feita' ? <CheckCircleIcon color="success" /> : estado === 'agora' ? <CircularProgress size={22} thickness={5} /> : <RadioButtonUncheckedIcon color="disabled" />}
      <Box sx={{ textAlign: 'left' }}>
        <Typography fontWeight={estado === 'agora' ? 800 : 600}>{texto}</Typography>
        {detalhe && <Typography variant="body2" color="text.secondary">{detalhe}</Typography>}
      </Box>
    </Box>
  );
}

let proximoId = 1;

// reduz a foto para o lado maior ter até 1600 px e devolve o JPEG em base64 (sem o "data:...,")
async function reduzirFoto(arquivo: File): Promise<{ dados: string; previa: string }> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error(`Não deu para abrir a foto "${arquivo.name}". Use JPG ou PNG.`));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAIOR / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';   // PNG com fundo transparente vira branco, não preto
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { dados: dataUrl.split(',')[1], previa: dataUrl };
  } finally { URL.revokeObjectURL(url); }
}

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).split(',')[1] || '');
    leitor.onerror = () => falha(new Error(`Não deu para ler "${arquivo.name}".`));
    leitor.readAsDataURL(arquivo);
  });
}

function BotaoOrigem({ icone, titulo, dica, onClick, desligado }: { icone: React.ReactNode; titulo: string; dica: string; onClick: () => void; desligado: boolean }) {
  return (
    <Button variant="outlined" onClick={onClick} disabled={desligado}
      sx={{ flexDirection: 'column', gap: 0.5, py: 1.5, px: 1, borderRadius: 3, textTransform: 'none', minHeight: 104, flex: 1, minWidth: 0 }}>
      {icone}
      <Typography fontWeight={800} fontSize={15}>{titulo}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>{dica}</Typography>
    </Button>
  );
}

export default function GerarComIA({ aberto, aoFechar, aoGerar }: Props) {
  const [status, setStatus] = useState<StatusIA | null>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [quantidade, setQuantidade] = useState(10);
  const [dificuldade, setDificuldade] = useState('media');
  const [materia, setMateria] = useState('');
  const [tema, setTema] = useState('');
  const [serie, setSerie] = useState('');
  const [erro, setErro] = useState('');
  const [preparando, setPreparando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [progresso, setProgresso] = useState<Progresso>({ fase: 'enviando', enviado: 0, total: 0, inicioIA: 0 });
  const refXhr = useRef<XMLHttpRequest | null>(null);
  const refCamera = useRef<HTMLInputElement>(null);
  const refGaleria = useRef<HTMLInputElement>(null);
  const refPdf = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    api<StatusIA>('/questionarios/ia').then(setStatus).catch((e) => { setStatus({ configurada: false, limite: 0, restantes: 0 }); setErro(mensagemDoErro(e)); });
  }, [aberto]);

  useEffect(() => {
    if (!gerando) return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [gerando]);

  const acrescentar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setErro('');
    const arquivos = Array.from(lista).slice(0, MAX_ARQUIVOS - materiais.length);
    if (lista.length > arquivos.length) setErro(`No máximo ${MAX_ARQUIVOS} arquivos por vez: fiquei com os primeiros.`);
    setPreparando(true);
    try {
      const novos: Material[] = [];
      for (const arquivo of arquivos) {
        if (arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name)) {
          if (arquivo.size > MAX_PDF) throw new Error(`O PDF "${arquivo.name}" passa de 10 MB. Mande só as páginas do exercício.`);
          novos.push({ id: proximoId++, nome: arquivo.name, tipo: 'pdf', dados: await lerBase64(arquivo) });
        } else if (arquivo.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(arquivo.name)) {
          const { dados, previa } = await reduzirFoto(arquivo);
          novos.push({ id: proximoId++, nome: arquivo.name, tipo: 'foto', dados, previa });
        } else throw new Error(`"${arquivo.name}" não é foto nem PDF.`);
      }
      setMateriais((m) => [...m, ...novos]);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setPreparando(false); }
  };

  const limpar = () => { setMateriais([]); setErro(''); setTema(''); };
  const fechar = () => { if (!gerando) { limpar(); aoFechar(); } };

  const gerar = async () => {
    setErro('');
    if (!materiais.length) { setErro('Tire uma foto ou escolha uma imagem ou PDF do exercício.'); return; }
    setProgresso({ fase: 'enviando', enviado: 0, total: 0, inicioIA: 0 });
    setGerando(true);
    try {
      const r = await enviarComProgresso<{ perguntas: PerguntaQuiz[]; restantes: number }>('/questionarios/gerar-ia',
        { arquivos: materiais.map((m) => m.dados), quantidade, dificuldade, materia: materia === 'Outra' ? '' : materia, tema: tema.trim(), serie: serie.trim() },
        (enviado, total) => setProgresso((p) => ({ ...p, enviado, total })),
        () => setProgresso((p) => ({ ...p, fase: 'ia', enviado: p.total, inicioIA: Date.now() })),
        (x) => { refXhr.current = x; });
      // um instante com a barra cheia, para o professor ver que terminou
      setProgresso((p) => ({ ...p, fase: 'pronto' }));
      await new Promise((ok) => setTimeout(ok, 600));
      setStatus((s) => (s ? { ...s, restantes: r.restantes } : s));
      aoGerar(r.perguntas, tema.trim() || (materia && materia !== 'Outra' ? materia : 'Questionário'));
      limpar();
      aoFechar();
    } catch (e) {
      if (!(e instanceof ErroApi && e.codigo === 'cancelado')) setErro(mensagemDoErro(e));
    } finally { setGerando(false); refXhr.current = null; }
  };

  const semIA = status && !status.configurada;
  const semCota = status?.configurada && status.restantes <= 0;
  const cheio = materiais.length >= MAX_ARQUIVOS;
  // segundos desde que o material terminou de subir (a parte da IA); o relógio (segundos) redesenha a tela a cada segundo
  const naIA = progresso.fase === 'enviando' ? 0 : Math.max(0, Math.round((Date.now() - progresso.inicioIA) / 1000));
  const fracEnvio = progresso.total ? progresso.enviado / progresso.total : 0;
  const porcento = progresso.fase === 'pronto' ? 100 : progresso.fase === 'enviando' ? Math.round(fracEnvio * 25) : Math.round(25 + 70 * (1 - Math.exp(-naIA / 18)));
  const etapaIA = progresso.fase === 'pronto' ? 3 : progresso.fase === 'enviando' ? -1 : naIA < 6 ? 0 : naIA < 18 ? 1 : 2;
  const estado = (i: number): 'feita' | 'agora' | 'depois' => (etapaIA > i ? 'feita' : etapaIA === i ? 'agora' : 'depois');

  return (
    <Popup aberto={aberto} titulo="✨ Gerar perguntas com IA" aoFechar={fechar} largo erro={erro}
      aoSalvar={semIA || semCota ? undefined : gerar} textoSalvar={gerando ? 'Gerando…' : `Gerar ${quantidade} perguntas`} salvando={gerando || preparando}>
      {gerando ? (
        <Box sx={{ py: 2, textAlign: 'center', maxWidth: 440, mx: 'auto' }}>
          <AutoAwesomeIcon color="primary" sx={{ fontSize: 48, mb: 0.5 }} />
          <Typography variant="h6" fontWeight={800}>{progresso.fase === 'pronto' ? 'Pronto! Abrindo as perguntas…' : 'Estamos gerando as perguntas'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
            <LinearProgress variant="determinate" value={porcento} sx={{ flex: 1, height: 10, borderRadius: 5 }} aria-label="Progresso da geração" />
            <Typography fontWeight={800} sx={{ minWidth: 44, textAlign: 'right' }}>{porcento}%</Typography>
          </Box>
          <Box sx={{ textAlign: 'left', mb: 1.5 }} aria-live="polite">
            <Etapa estado={progresso.fase === 'enviando' ? 'agora' : 'feita'} texto="Enviando o material"
              detalhe={progresso.fase === 'enviando' && progresso.total ? `${Math.round(fracEnvio * 100)}% · ${mb(progresso.enviado)} de ${mb(progresso.total)} MB` : `${materiais.length} arquivo(s)`} />
            <Etapa estado={estado(0)} texto="A IA está lendo suas páginas" />
            <Etapa estado={estado(1)} texto={`Montando as ${quantidade} perguntas`} />
            <Etapa estado={estado(2)} texto="Conferindo as respostas" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Tempo: {relogio(segundos)} · costuma levar de 10 segundos a 1 minuto.
          </Typography>
          {naIA >= 40 && progresso.fase === 'ia' && (
            <Alert severity="info" sx={{ mt: 1.5, textAlign: 'left' }}>
              {naIA < 100 ? 'Está demorando mais que o normal: a IA do Google está ocupada e estamos tentando outra. Não precisa fazer nada.'
                : 'Ainda tentando. Se passar de 3 minutos, cancele e tente de novo com menos páginas.'}
            </Alert>
          )}
          {progresso.fase !== 'pronto' && <Button onClick={() => refXhr.current?.abort()} sx={{ mt: 1.5 }}>Cancelar</Button>}
        </Box>
      ) : semIA ? (
        <Alert severity="info">A IA ainda não está configurada neste servidor. Peça ao administrador para cadastrar a chave grátis do Google (GEMINI_API_KEY). Enquanto isso, use a planilha.</Alert>
      ) : (
        <>
          {status?.falsa && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <b>Modo de teste ligado (IA_FALSA=1):</b> as perguntas são de exemplo e NÃO saem da sua foto. Para usar a IA de
              verdade, coloque a GEMINI_API_KEY no .env, mude IA_FALSA para 0 e reinicie a API.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Mande as páginas do exercício (livro, caderno, lousa ou PDF). A IA cria as perguntas e você confere antes de salvar.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <BotaoOrigem icone={<PhotoCameraIcon />} titulo="Tirar foto" dica="Boa luz, página inteira" onClick={() => refCamera.current?.click()} desligado={cheio || preparando} />
            <BotaoOrigem icone={<PhotoLibraryIcon />} titulo="Da galeria" dica="Várias de uma vez" onClick={() => refGaleria.current?.click()} desligado={cheio || preparando} />
            <BotaoOrigem icone={<PictureAsPdfIcon />} titulo="PDF" dica="Até 10 MB" onClick={() => refPdf.current?.click()} desligado={cheio || preparando} />
          </Box>
          <input ref={refCamera} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { acrescentar(e.target.files); e.target.value = ''; }} />
          <input ref={refGaleria} type="file" hidden accept="image/jpeg,image/png,image/webp,image/*" multiple onChange={(e) => { acrescentar(e.target.files); e.target.value = ''; }} />
          <input ref={refPdf} type="file" hidden accept="application/pdf,.pdf" onChange={(e) => { acrescentar(e.target.files); e.target.value = ''; }} />

          {preparando && <LinearProgress sx={{ mb: 1.5 }} aria-label="Preparando as fotos" />}
          {materiais.length > 0 && (
            <>
              <Typography fontWeight={800} sx={{ mb: 1 }}>Material ({materiais.length}/{MAX_ARQUIVOS})</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {materiais.map((m, i) => (
                  <Paper key={m.id} variant="outlined" sx={{ position: 'relative', width: 92, height: 112, borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                    {m.previa ? <Box component="img" src={m.previa} alt={`Página ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Box sx={{ textAlign: 'center', px: 0.5 }}><PictureAsPdfIcon color="error" sx={{ fontSize: 36 }} /><Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all', lineHeight: 1.1 }}>{m.nome.slice(0, 24)}</Typography></Box>}
                    <Box sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'background.paper', borderRadius: '50%', width: 22, height: 22, fontSize: 13, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{i + 1}</Box>
                    <IconButton size="small" aria-label={`Tirar ${m.tipo === 'pdf' ? 'o PDF' : `a página ${i + 1}`}`} onClick={() => setMateriais((ms) => ms.filter((x) => x.id !== m.id))}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            </>
          )}

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 2 }}>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>Quantas perguntas?</Typography>
              <ToggleButtonGroup exclusive fullWidth value={quantidade} onChange={(_, v) => v && setQuantidade(v)} aria-label="Quantas perguntas">
                {[5, 10, 15].map((n) => <ToggleButton key={n} value={n} sx={{ minHeight: 44 }}>{n}</ToggleButton>)}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>Dificuldade</Typography>
              <ToggleButtonGroup exclusive fullWidth value={dificuldade} onChange={(_, v) => v && setDificuldade(v)} aria-label="Dificuldade">
                <ToggleButton value="facil" sx={{ minHeight: 44 }}>Fácil</ToggleButton>
                <ToggleButton value="media" sx={{ minHeight: 44 }}>Média</ToggleButton>
                <ToggleButton value="dificil" sx={{ minHeight: 44 }}>Difícil</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <TextField select label="Matéria (opcional)" value={materia} onChange={(e) => setMateria(e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {MATERIAS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label="Ano/série (opcional)" value={serie} onChange={(e) => setSerie(e.target.value)} inputProps={{ maxLength: 40 }} placeholder="Ex.: 5º ano" />
            <TextField label="Tema (opcional)" value={tema} onChange={(e) => setTema(e.target.value)} inputProps={{ maxLength: 120 }} placeholder="Ex.: Frações · vira o nome do questionário"
              sx={{ gridColumn: { sm: '1 / -1' } }} />
          </Box>

          <Alert severity="warning" icon={<ShieldOutlinedIcon />} sx={{ mb: 1 }}>
            No plano gratuito o Google pode usar o conteúdo enviado — não fotografe nomes ou dados de alunos.
          </Alert>
          {status && (
            <Typography variant="body2" color={semCota ? 'error' : 'text.secondary'}>
              {semCota ? `Você já usou as ${status.limite} gerações de hoje. Amanhã libera de novo.` : `Você ainda pode gerar ${status.restantes} vez(es) hoje.`}
            </Typography>
          )}
        </>
      )}
    </Popup>
  );
}
