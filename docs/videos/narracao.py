"""Gera a narração do vídeo (uma faixa por cena) com a voz neural do Edge (pacote edge-tts, precisa de internet).

Uso:  python docs/videos/narracao.py [pasta_de_saida] [voz]
  pasta padrão: docs/videos/tmp/audio (fora do git) · voz padrão: a do cenas.json (pt-BR-FranciscaNeural)
Para cada cena grava NN.mp3 e NN.json (o tempo de cada frase, para as legendas).
"""
import asyncio
import json
import pathlib
import sys

import edge_tts

AQUI = pathlib.Path(__file__).resolve().parent
CFG = json.loads((AQUI / "cenas.json").read_text(encoding="utf-8"))
SAIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "tmp" / "audio"
VOZ = sys.argv[2] if len(sys.argv) > 2 else CFG["voz"]
SAIDA.mkdir(parents=True, exist_ok=True)


async def uma_cena(c):
    fala = edge_tts.Communicate(c["texto"], VOZ, rate=CFG.get("ritmo", "+0%"), boundary="SentenceBoundary")
    frases = []
    with open(SAIDA / f"{c['n']:02d}.mp3", "wb") as arq:
        async for pedaco in fala.stream():
            if pedaco["type"] == "audio":
                arq.write(pedaco["data"])
            elif pedaco["type"] in ("SentenceBoundary", "WordBoundary"):
                # offset e duração vêm em unidades de 100 ns
                frases.append({"texto": pedaco["text"], "inicio": pedaco["offset"] / 1e7, "fim": (pedaco["offset"] + pedaco["duration"]) / 1e7})
    (SAIDA / f"{c['n']:02d}.json").write_text(json.dumps(frases, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"cena {c['n']:2d}: {len(frases)} frase(s), termina em {frases[-1]['fim'] if frases else 0:.1f} s")


async def main():
    for c in CFG["cenas"]:
        await uma_cena(c)

asyncio.run(main())
