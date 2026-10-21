# Recorta o logo do Colégio Pleno da captura de tela: tira o fundo claro (vira transparente)
# e corta as bordas vazias. Uso: powershell -ExecutionPolicy Bypass -File ferramentas\logo.ps1
# Para outro logo: ... ferramentas\logo.ps1 assets\logo-pe-original.png assets\logo-pe.png
param([string]$Entrada = 'assets\logo-original.png', [string]$Saida = 'assets\logo-pleno.png')
$raiz = Split-Path $PSScriptRoot -Parent
$entrada = Join-Path $raiz $Entrada
$saida = Join-Path $raiz $Saida

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Logo {
  public static string Processar(string entrada, string saida) {
    var orig = new Bitmap(entrada);
    int W = orig.Width, H = orig.Height;
    var bmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) g.DrawImage(orig, 0, 0, W, H);
    var d = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[W * H * 4];
    Marshal.Copy(d.Scan0, px, 0, px.Length);

    // fundo = pixels claros e sem cor ligados à borda (o branco do texto fica, pois está dentro do roxo)
    Func<int, bool> claro = p => {
      int i = p * 4; int r = px[i+2], g = px[i+1], b = px[i];
      int mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
      return mn > 200 && mx - mn < 25;
    };
    var fundo = new bool[W * H];
    var fila = new Queue<int>();
    for (int x = 0; x < W; x++) { fila.Enqueue(x); fila.Enqueue((H - 1) * W + x); }
    for (int y = 0; y < H; y++) { fila.Enqueue(y * W); fila.Enqueue(y * W + W - 1); }
    while (fila.Count > 0) {
      int p = fila.Dequeue();
      if (fundo[p] || !claro(p)) continue;
      fundo[p] = true;
      int x = p % W, y = p / W;
      if (x > 0) fila.Enqueue(p - 1); if (x < W - 1) fila.Enqueue(p + 1);
      if (y > 0) fila.Enqueue(p - W); if (y < H - 1) fila.Enqueue(p + W);
    }
    int minX = W, minY = H, maxX = 0, maxY = 0;
    for (int p = 0; p < W * H; p++) {
      if (fundo[p]) { px[p * 4 + 3] = 0; continue; }
      int x = p % W, y = p / W;
      minX = Math.Min(minX, x); maxX = Math.Max(maxX, x); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y);
    }
    Marshal.Copy(px, 0, d.Scan0, px.Length);
    bmp.UnlockBits(d);
    var r2 = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    using (var corte = bmp.Clone(r2, PixelFormat.Format32bppArgb)) corte.Save(saida, ImageFormat.Png);
    bmp.Dispose(); orig.Dispose();
    return String.Format("{0}x{1} -> {2}x{3}", W, H, r2.Width, r2.Height);
  }
}
'@
[Logo]::Processar($entrada, $saida)
