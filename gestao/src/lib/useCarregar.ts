// Busca uma lista na API ao abrir a tela; "recarregar" depois de salvar (sem piscar a lista: mantém os dados antigos
// enquanto busca de novo). caminho null = não precisa buscar (ex.: a lista de escolas, que só o administrador usa).
import { useCallback, useEffect, useState } from 'react';
import { api, mensagemDoErro } from './api';

export function useCarregar<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    if (!caminho) return;
    setErro('');
    try { setDados(await api<T>(caminho)); } catch (e) { setErro(mensagemDoErro(e)); }
  }, [caminho]);

  useEffect(() => { recarregar(); }, [recarregar]);

  return { dados, erro, carregando: !!caminho && !dados && !erro, recarregar };
}
