// Aplicar uma anamnese ao aluno, de um dos dois jeitos:
//  - "preencher": quem conversou com a família responde agora (precisa da autorização do responsável, LGPD);
//  - "link": gera um link de 3 horas para a família responder sozinha (WhatsApp ou e-mail).
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Popup from '../../../components/Popup';
import { useAvisos } from '../../../components/Avisos';
import { api, mensagemDoErro } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { copiar } from '../../../lib/formato';
import { faltando, ResponderPerguntas, Respostas } from './Perguntas';
import type { AlunoDaEscola, ModeloAnamnese } from '../../../types';

interface Props {
  modo: 'preencher' | 'link' | null;
  aluno: AlunoDaEscola;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const hora = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function PopupAnamnese({ modo, aluno, aoFechar, aoSalvar }: Props) {
  const { usuario } = useAuth();
  const avisar = useAvisos();
  const [modelos, setModelos] = useState<ModeloAnamnese[] | null>(null);
  const [modeloId, setModeloId] = useState('');
  const [respostas, setRespostas] = useState<Respostas>({});
  const [quem, setQuem] = useState('');
  const [autorizado, setAutorizado] = useState(false);
  const [destaque, setDestaque] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState<{ url: string; expira: string } | null>(null);

  useEffect(() => {
    if (!modo) return;
    setRespostas({}); setQuem(''); setAutorizado(false); setDestaque(''); setErro(''); setLink(null);
    api<ModeloAnamnese[]>('/anamneses/modelos').then((ms) => {
      const ativos = ms.filter((m) => m.ativo);
      setModelos(ativos);
      setModeloId(ativos.length === 1 ? ativos[0].id : '');
    }).catch((e) => { setModelos([]); setErro(mensagemDoErro(e)); });
  }, [modo]);

  const modelo = modelos?.find((m) => m.id === modeloId);
  const precisaAutorizar = !aluno.consentimento_em;
  const primeiroNome = (aluno.nome_completo || aluno.nome).split(' ')[0];

  const salvar = async () => {
    setErro(''); setDestaque('');
    if (!modelo) { setErro('Escolha o questionário de anamnese.'); return; }
    if (modo === 'link') {
      setSalvando(true);
      try {
        const r = await api<{ token: string; expira_em: string }>(`/alunos/${aluno.id}/anamneses/link`, { metodo: 'POST', corpo: { modelo_id: modelo.id } });
        setLink({ url: `${location.origin}/anamnese.html?t=${encodeURIComponent(r.token)}`, expira: r.expira_em });
        aoSalvar();
      } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
      return;
    }
    const falta = faltando(modelo.perguntas, respostas);
    if (falta) {
      setErro(`Responda a pergunta ${modelo.perguntas.indexOf(falta) + 1}: ${falta.texto}`);
      setDestaque(falta.id);
      document.getElementById(`pergunta-${falta.id}`)?.focus();
      document.getElementById(`pergunta-${falta.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (precisaAutorizar && !autorizado) { setErro('Confirme que o responsável autorizou o registro destas informações (LGPD).'); return; }
    setSalvando(true);
    try {
      await api(`/alunos/${aluno.id}/anamneses`, { metodo: 'POST', corpo: {
        modelo_id: modelo.id, respostas, respondida_por_nome: quem.trim() || usuario?.nome, consentimento: autorizado || undefined,
      } });
      aoSalvar();
      aoFechar();
      avisar('Anamnese gravada.');
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  const mensagem = link ? `Olá! A escola pediu para você responder um questionário sobre ${primeiroNome}. O link vale até ${hora(link.expira)}: ${link.url}` : '';

  return (
    <Popup aberto={!!modo} titulo={modo === 'link' ? `Link para a família · ${aluno.nome}` : `Anamnese · ${aluno.nome}`} aoFechar={aoFechar}
      aoSalvar={link ? undefined : salvar} textoSalvar={modo === 'link' ? 'Gerar link' : 'Gravar anamnese'} salvando={salvando} erro={erro} largo={modo === 'preencher'}>
      {link ? (
        <Stack spacing={2}>
          <Alert severity="success">Link criado. Ele vale até <b>{hora(link.expira)}</b> (3 horas) e aceita uma resposta só.</Alert>
          <TextField label="Link para a família" value={link.url} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} />
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Button variant="contained" size="large" startIcon={<WhatsAppIcon />} href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener">
              Mandar pelo WhatsApp
            </Button>
            <Button variant="outlined" size="large" startIcon={<ContentCopyIcon />} onClick={async () => { if (await copiar(mensagem)) avisar('Mensagem copiada.'); }}>
              Copiar mensagem
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">Quando a família responder, a anamnese aparece no histórico do aluno.</Typography>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {modelos && modelos.length === 0 && (
            <Alert severity="info">Nenhum modelo de anamnese ativo. Crie um em <b>Modelos de anamnese</b> (dá para montar a partir do banco de perguntas).</Alert>
          )}
          {modelos && modelos.length > 0 && (
            <TextField select label="Questionário" value={modeloId} onChange={(e) => { setModeloId(e.target.value); setRespostas({}); }}>
              {modelos.map((m) => <MenuItem key={m.id} value={m.id}>{m.titulo} ({m.perguntas.length} perguntas)</MenuItem>)}
            </TextField>
          )}
          {modo === 'link' && (
            <Typography color="text.secondary">
              A família recebe um link que vale 3 horas. Ela responde no celular, sem precisar de senha. Só o primeiro nome do aluno aparece na página.
            </Typography>
          )}
          {modo === 'preencher' && modelo && (
            <>
              <TextField label="Quem está respondendo" value={quem} onChange={(e) => setQuem(e.target.value)} placeholder={`Ex.: mãe, Maria (padrão: ${usuario?.nome})`} />
              <ResponderPerguntas perguntas={modelo.perguntas} respostas={respostas} destaque={destaque}
                aoMudar={(id, valor) => { setRespostas((r) => ({ ...r, [id]: valor })); if (id === destaque) setDestaque(''); }} />
              {precisaAutorizar && (
                <FormControlLabel control={<Checkbox checked={autorizado} onChange={(e) => setAutorizado(e.target.checked)} />}
                  label="O responsável autorizou a escola a registrar estas informações (LGPD)." sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }} />
              )}
            </>
          )}
        </Stack>
      )}
    </Popup>
  );
}
