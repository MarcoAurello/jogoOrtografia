# Recorta o Plenix com fundo transparente comparando duas imagens iguais com fundos diferentes
# (assets/plenix-original/pensando.webp = fundo azul, vamos-jogar.webp = fundo roxo).
# Onde as duas imagens são iguais é o robô; onde mudam é o fundo. Isso também acerta as partes
# semitransparentes (vidro do capacete) e não confunde a calça roxa com o fundo roxo.
# Uso: powershell -ExecutionPolicy Bypass -File ferramentas\plenix.ps1
$raiz = Split-Path $PSScriptRoot -Parent
$a = Join-Path $raiz 'assets\plenix-original\pensando.webp'
$b = Join-Path $raiz 'assets\plenix-original\vamos-jogar.webp'
$saida = Join-Path $raiz 'assets\plenix.png'

Add-Type -AssemblyName PresentationCore, WindowsBase
function Pixels($arquivo) {
  $fs = [IO.File]::OpenRead($arquivo)
  $d = [System.Windows.Media.Imaging.BitmapDecoder]::Create($fs, 'PreservePixelFormat', 'OnLoad')
  $q = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap($d.Frames[0], [System.Windows.Media.PixelFormats]::Bgra32, $null, 0)
  $w = $q.PixelWidth; $h = $q.PixelHeight
  $px = New-Object byte[] ($w * $h * 4)
  $q.CopyPixels($px, $w * 4, 0)
  $fs.Close()
  return @{ w = $w; h = $h; px = $px }
}
$A = Pixels $a; $B = Pixels $b

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Plenix {
  public static string Recortar(byte[] p1, byte[] p2, int W, int H, string saida, int topoMin) {
    var res = new byte[W * H * 4];
    var alfa = new double[W * H];
    for (int y = 0; y < H; y++) {
      // cor do fundo nesta linha: média das bordas esquerda e direita de cada imagem
      double[] e1 = new double[3], d1 = new double[3], e2 = new double[3], d2 = new double[3];
      for (int x = 2; x < 12; x++) for (int c = 0; c < 3; c++) {
        e1[c] += p1[(y * W + x) * 4 + c] / 10.0; e2[c] += p2[(y * W + x) * 4 + c] / 10.0;
        d1[c] += p1[(y * W + W - 1 - x) * 4 + c] / 10.0; d2[c] += p2[(y * W + W - 1 - x) * 4 + c] / 10.0;
      }
      for (int x = 0; x < W; x++) {
        int i = (y * W + x) * 4; double t = x / (double)(W - 1);
        double[] b1 = new double[3], b2 = new double[3], dc = new double[3], db = new double[3];
        double num = 0, den = 0;
        for (int c = 0; c < 3; c++) {
          b1[c] = e1[c] + (d1[c] - e1[c]) * t; b2[c] = e2[c] + (d2[c] - e2[c]) * t;
          dc[c] = p1[i + c] - p2[i + c]; db[c] = b1[c] - b2[c];
          num += dc[c] * db[c]; den += db[c] * db[c];
        }
        // C1 - C2 = (1 - a) * (B1 - B2)
        double fundo = den > 400 ? Math.Max(0, Math.Min(1, num / den)) : 1;
        double a = 1 - fundo;
        if (y < topoMin) a = 0;           // título do cartaz
        if (a < 0.1) a = 0; else if (a > 0.9) a = 1;
        alfa[y * W + x] = a;
        if (a > 0) for (int c = 0; c < 3; c++) {
          double f = (p1[i + c] - (1 - a) * b1[c]) / a;
          res[i + c] = (byte)Math.Max(0, Math.Min(255, f));
        }
        res[i + 3] = (byte)(a * 255);
      }
    }
    // fica só o maior pedaço (o robô + sombra); some "?" e confetes soltos
    var rotulo = new int[W * H]; int melhor = 0, maior = 0, id = 0;
    var tam = new List<int> { 0 };
    var pilha = new Stack<int>();
    for (int p0 = 0; p0 < W * H; p0++) {
      if (alfa[p0] < 0.35 || rotulo[p0] != 0) continue;
      id++; int n = 0; rotulo[p0] = id; pilha.Push(p0);
      while (pilha.Count > 0) {
        int q = pilha.Pop(); n++; int qx = q % W, qy = q / W;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          int nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          int np = ny * W + nx; if (rotulo[np] == 0 && alfa[np] >= 0.35) { rotulo[np] = id; pilha.Push(np); }
        }
      }
      tam.Add(n); if (n > maior) { maior = n; melhor = id; }
    }
    // perto do robô (até 3px) mantém a borda suave; longe dele apaga
    var perto = new bool[W * H];
    for (int p = 0; p < W * H; p++) if (rotulo[p] == melhor) {
      int x = p % W, y = p / W;
      for (int dy = -3; dy <= 3; dy++) for (int dx = -3; dx <= 3; dx++) {
        int nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) perto[ny * W + nx] = true;
      }
    }
    int minX = W, minY = H, maxX = 0, maxY = 0;
    for (int p = 0; p < W * H; p++) {
      if (!perto[p]) { res[p * 4 + 3] = 0; continue; }
      if (res[p * 4 + 3] > 10) { int x = p % W, y = p / W; minX = Math.Min(minX, x); maxX = Math.Max(maxX, x); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y); }
    }
    var bmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    var d = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(res, 0, d.Scan0, res.Length); bmp.UnlockBits(d);
    var r = new Rectangle(Math.Max(0, minX - 4), Math.Max(0, minY - 4), Math.Min(W, maxX + 5) - Math.Max(0, minX - 4), Math.Min(H, maxY + 5) - Math.Max(0, minY - 4));
    using (var corte = bmp.Clone(r, PixelFormat.Format32bppArgb)) corte.Save(saida, ImageFormat.Png);
    bmp.Dispose();
    return r.Width + "x" + r.Height + " (de " + W + "x" + H + ")";
  }
}
'@
[Plenix]::Recortar($A.px, $B.px, $A.w, $A.h, $saida, 92)
"salvo em $saida ($([math]::Round((Get-Item $saida).Length / 1KB)) KB)"
