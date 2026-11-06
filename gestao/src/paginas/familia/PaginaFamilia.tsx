// Família: a página de cadastro de endereço fixo (/<escola>/cadastro ou /cadastro/<apelido>: o responsável preenche e
// cadastra os filhos, que já entram na escola ou como pacientes do professor avulso), com a chave "aceitar cadastros",
// e o que a família vê (as chaves de cada relatório, gravadas na hora).
// A coordenação cuida da escola; o professor avulso, dos pacientes dele. A API confere quem pode.
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Skeleton, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import QRCode from 'qrcode';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import ChaveConfig from '../../components/ChaveConfig';
import Secao from '../../components/Secao';
import { ErroLista } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { copiar } from '../../lib/formato';
import { RELATORIOS_FAMILIA } from '../../lib/familia';
import type { ChavesFamilia, RelatorioFamilia } from '../../types';

export default function PaginaFamilia() {
  const { usuario } = useAuth();
  const avulso = usuario?.perfil === 'professor' && !usuario.escola;
  return (
    <>
      <CabecalhoPagina titulo="Família"
        subtitulo={avulso ? 'A página de cadastro para as famílias dos seus pacientes e o que elas veem.' : 'A página de cadastro das famílias e o que elas veem.'} />
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start', pb: 4 }}>
        <PaginaDeCadastro avulso={avulso} />
        <OQueAFamiliaVe avulso={avulso} />
      </Box>
    </>
  );
}

// ---------- página de cadastro ----------

type Cadastro = { aceita: boolean; caminho: string };

function PaginaDeCadastro({ avulso }: { avulso: boolean }) {
  const { dados, erro, recarregar } = useCarregar<Cadastro>('/cadastro-familia/config');
  const avisar = useAvisos();
  const [atual, setAtual] = useState<Cadastro | null>(null);
  const [gravando, setGravando] = useState(false);
  const [qr, setQr] = useState('');
  const c = atual || dados;
  const url = c ? `${window.location.origin}${c.caminho}` : '';

  // o QR code é desenhado aqui mesmo (sem mandar o endereço para nenhum serviço de fora)
  useEffect(() => {
    if (!url) { setQr(''); return; }
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [url]);

  const mudar = async (aceita: boolean) => {
    setGravando(true);
    try {
      setAtual(await api<Cadastro>('/cadastro-familia/config', { metodo: 'PUT', corpo: { aceita } }));
      avisar(aceita ? 'Cadastro aberto para as famílias.' : 'Cadastro fechado.');
    } catch (e) { avisar(mensagemDoErro(e), 'error'); } finally { setGravando(false); }
  };

  const mensagem = `Olá! Cadastre-se aqui para acompanhar ${avulso ? 'o atendimento' : 'a escola'} do seu filho: ${url}`;
  const podeCompartilhar = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <Secao titulo="Página de cadastro"
      subtitulo={avulso
        ? 'A família abre, preenche, autoriza (LGPD) e cadastra os filhos. Eles já aparecem como seus pacientes.'
        : 'A família abre, preenche, autoriza (LGPD) e cadastra os filhos. Eles já entram na escola, aguardando turma.'}>
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!erro && !c && <Skeleton variant="rounded" height={200} />}
      {c && (
        <Stack spacing={2}>
          <ChaveConfig titulo="Aceitar cadastros de famílias" ligado={c.aceita} aoMudar={mudar} desabilitado={gravando}
            textoLigado="A página está aberta: quem tem o endereço se cadastra."
            textoDesligado="A página avisa que o cadastro não está aberto." />
          <TextField label="Endereço da página" value={url} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()}
            helperText="Sempre o mesmo: pode imprimir no bilhete, mandar no grupo ou pôr no site." />
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: podeCompartilhar ? '1fr 1fr 1fr' : '1fr 1fr' } }}>
            <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={async () => { if (await copiar(url)) avisar('Endereço copiado.'); }}>Copiar</Button>
            <Button variant="outlined" startIcon={<WhatsAppIcon />} component="a" target="_blank" rel="noopener"
              href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}>WhatsApp</Button>
            {podeCompartilhar && (
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => navigator.share({ title: 'Cadastro da família', text: mensagem }).catch(() => undefined)}>Enviar…</Button>
            )}
          </Box>
          {qr && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box component="img" src={qr} alt="QR code da página de cadastro" sx={{ width: 160, height: 160, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: '#fff' }} />
              <Stack spacing={1} sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" color="text.secondary">Para imprimir no bilhete ou mostrar na reunião: a família aponta a câmera do celular.</Typography>
                <Button component="a" href={qr} download="cadastro-familia.png" sx={{ alignSelf: 'flex-start' }}>Baixar o QR code</Button>
              </Stack>
            </Box>
          )}
          <Button component="a" href={url} target="_blank" rel="noopener" sx={{ alignSelf: 'flex-start' }}>Abrir a página</Button>
        </Stack>
      )}
    </Secao>
  );
}

// ---------- o que a família vê ----------

function OQueAFamiliaVe({ avulso }: { avulso: boolean }) {
  const avisar = useAvisos();
  const { dados, erro, recarregar } = useCarregar<{ chaves: ChavesFamilia }>('/visivel-familia');
  const [gravando, setGravando] = useState<RelatorioFamilia | ''>('');
  const [chaves, setChaves] = useState<ChavesFamilia | null>(null);
  const atuais = chaves || dados?.chaves || null;

  const mudar = async (chave: RelatorioFamilia, ligado: boolean) => {
    setGravando(chave);
    try {
      const r = await api<{ chaves: ChavesFamilia }>('/visivel-familia', { metodo: 'PUT', corpo: { [chave]: ligado } });
      setChaves(r.chaves);
      avisar(ligado ? 'Agora a família vê.' : 'Agora a família não vê.');
    } catch (e) { avisar(mensagemDoErro(e), 'error'); } finally { setGravando(''); }
  };

  return (
    <Secao titulo="O que a família vê" subtitulo={avulso ? 'Vale para as famílias dos seus pacientes.' : 'Vale para todas as famílias da escola.'}>
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!erro && !atuais && <Skeleton variant="rounded" height={320} />}
      {atuais && (
        <Stack spacing={1.5}>
          {RELATORIOS_FAMILIA.map((r) => (
            <ChaveConfig key={r.chave} titulo={r.titulo} ligado={atuais[r.chave]} aoMudar={(v) => mudar(r.chave, v)}
              textoLigado={r.ligado} textoDesligado={r.desligado} desabilitado={!!gravando} />
          ))}
          <Alert severity="info">
            Relatório desligado some da tela da família. Para um aluno diferente, abra a ficha dele, aba <b>Família</b>.
            Observações internas nunca aparecem para a família.
          </Alert>
          <Typography variant="body2" color="text.secondary">Padrão: jogos e recados ligados; plano e anamnese desligados.</Typography>
        </Stack>
      )}
    </Secao>
  );
}
