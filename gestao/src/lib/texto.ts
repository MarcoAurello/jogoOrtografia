// busca sem diferença de acentos e maiúsculas ("João" acha "joao")
export const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const contem = (texto: string, busca: string) => normalizar(texto).includes(normalizar(busca));
