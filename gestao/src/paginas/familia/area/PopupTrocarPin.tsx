// Trocar o PIN do filho: 4 números, digitados duas vezes num teclado numérico grande (como o da entrada do aluno,
// js/entrada.js). As regras são as da API (api/src/services/pin.ts): PIN fácil (0000, 1234) é recusado. Trocar o PIN
// também destrava o filho se ele errou o PIN 5 vezes.
import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import Popup from '../../../components/Popup';
import { api, mensagemDoErro } from '../../../lib/api';
import { useAvisos } from '../../../components/Avisos';

const TAMANHO = 4;

// tudo igual (0000) ou sequência (1234, 4321): a mesma conta da API
function pinObvio(pin: string) {
  if (/^(\d)\1+$/.test(pin)) return true;
  const d = pin.split('').map(Number);
  const passo = d[1] - d[0];
  return Math.abs(passo) === 1 && d.every((n, i) => i === 0 || n - d[i - 1] === passo);
}

function Bolinhas({ qtd, erro }: { qtd: number; erro: boolean }) {
  return (
    <Box aria-hidden sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 1 }}>
      {Array.from({ length: TAMANHO }, (_, i) => (
        <Box key={i} sx={{ width: 22, height: 22, borderRadius: '50%', border: 2,
          borderColor: erro ? 'error.main' : 'primary.main', bgcolor: i < qtd ? (erro ? 'error.main' : 'primary.main') : 'transparent' }} />
      ))}
    </Box>
  );
}

function Teclado({ aoDigitar, aoApagar }: { aoDigitar: (n: string) => void; aoApagar: () => void }) {
  const tecla = { minHeight: 64, fontSize: 28, fontWeight: 800, borderRadius: 3 };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, maxWidth: 320, mx: 'auto', width: '100%' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
        <Button key={n} variant="outlined" sx={tecla} onClick={() => aoDigitar(n)}>{n}</Button>
      ))}
      <Box />
      <Button variant="outlined" sx={tecla} onClick={() => aoDigitar('0')}>0</Button>
      <Button variant="text" sx={{ ...tecla, fontSize: 24 }} onClick={aoApagar} aria-label="Apagar o último número">⌫</Button>
    </Box>
  );
}

// rota: a do responsável (padrão) ou a da equipe (/alunos/:id/pin, na aba Família da página do aluno)
export default function PopupTrocarPin({ filho, aoFechar, rota }: { filho: { id: string; nome: string } | null; aoFechar: () => void; rota?: string }) {
  const avisar = useAvisos();
  const [pin, setPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (filho) { setPin(''); setConfirmacao(''); setEtapa(1); setErro(''); } }, [filho]);

  const atual = etapa === 1 ? pin : confirmacao;
  const mudar = etapa === 1 ? setPin : setConfirmacao;

  const digitar = (n: string) => {
    if (atual.length >= TAMANHO) return;
    setErro('');
    const novo = atual + n;
    mudar(novo);
    if (novo.length < TAMANHO) return;
    // a primeira vez completa: confere se não é fácil demais e passa para a repetição
    if (etapa === 1) {
      if (pinObvio(novo)) { setErro('Esse PIN é fácil demais de adivinhar (como 0000 ou 1234). Escolha outro.'); setPin(''); return; }
      setEtapa(2);
    }
  };

  // no PC também dá para digitar pelo teclado
  useEffect(() => {
    if (!filho) return;
    const tecla = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) { e.preventDefault(); digitar(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); setErro(''); mudar(atual.slice(0, -1)); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const recomecar = (mensagem: string) => { setErro(mensagem); setPin(''); setConfirmacao(''); setEtapa(1); };

  const salvar = async () => {
    if (!filho) return;
    if (pin.length < TAMANHO || etapa === 1) return setErro(`Digite os ${TAMANHO} números do PIN novo.`);
    if (confirmacao.length < TAMANHO) return setErro(`Digite os ${TAMANHO} números de novo para confirmar.`);
    if (confirmacao !== pin) return recomecar('Os dois PINs não são iguais. Comece de novo.');
    setSalvando(true);
    setErro('');
    try {
      await api(rota || `/familia/filhos/${filho.id}/pin`, { metodo: 'PUT', corpo: { pin, pin_confirmacao: confirmacao } });
      avisar(`PIN de ${filho.nome} trocado ✔`);
      aoFechar();
    } catch (e) {
      recomecar(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Popup aberto={!!filho} titulo={`Trocar o PIN de ${filho?.nome || ''}`} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar="Trocar PIN" salvando={salvando} erro={erro}>
      <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">
          O PIN é a senha de {TAMANHO} números que {filho?.nome || 'a criança'} digita para entrar nos jogos.
        </Typography>
        <Typography variant="h6" component="p" aria-live="polite">
          {etapa === 1 ? `Digite o PIN novo (${TAMANHO} números)` : 'Digite o mesmo PIN de novo'}
        </Typography>
        <Bolinhas qtd={atual.length} erro={!!erro} />
        <Teclado aoDigitar={digitar} aoApagar={() => { setErro(''); mudar(atual.slice(0, -1)); }} />
        {etapa === 2 && (
          <Button onClick={() => recomecar('')} sx={{ alignSelf: 'center', minHeight: 44 }}>↺ Começar de novo</Button>
        )}
        <Typography variant="body2" color="text.secondary">
          Se a criança errou o PIN muitas vezes e ficou travada, trocar o PIN destrava na hora.
        </Typography>
      </Stack>
    </Popup>
  );
}
