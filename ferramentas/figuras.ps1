# Recorta as figuras do cartaz de ortografia (assets/cartaz-original.png, 1536x1024)
# e salva uma imagem por palavra em assets/figuras/<missao>-<n>.jpg (quadradas, fundo branco).
# A ordem de cada painel é a mesma do dados.js. Uso: powershell -ExecutionPolicy Bypass -File ferramentas\figuras.ps1
$raiz = Split-Path $PSScriptRoot -Parent
$cartaz = Join-Path $raiz 'assets\cartaz-original.png'
$saida = Join-Path $raiz 'assets\figuras'
New-Item -ItemType Directory -Force $saida | Out-Null

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

public static class Figuras {
  static Bitmap folha; static byte[] px; static int W, H;

  public static void Abrir(string arquivo) {
    var orig = new Bitmap(arquivo);
    W = orig.Width; H = orig.Height;
    folha = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(folha)) g.DrawImage(orig, 0, 0, W, H);
    var d = folha.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    px = new byte[W * H * 4];
    Marshal.Copy(d.Scan0, px, 0, px.Length);
    folha.UnlockBits(d);
    orig.Dispose();
  }

  // recorta a caixa, tira as bordas brancas e centraliza num quadrado branco
  public static string Recortar(int x0, int y0, int x1, int y1, string saida, int lado, long qualidade) {
    int mnx = x1, mny = y1, mxx = x0, mxy = y0;
    for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++) {
      int i = (y * W + x) * 4;
      int mn = Math.Min(px[i], Math.Min(px[i+1], px[i+2]));
      if (mn < 228) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
    }
    if (mxx <= mnx) { mnx = x0; mny = y0; mxx = x1 - 1; mxy = y1 - 1; }
    int cw = mxx - mnx + 1, ch = mxy - mny + 1;
    using (var final = new Bitmap(lado, lado, PixelFormat.Format24bppRgb))
    using (var g = Graphics.FromImage(final)) {
      g.Clear(Color.White);
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      double esc = (lado * 0.94) / Math.Max(cw, ch);
      int fw = (int)(cw * esc), fh = (int)(ch * esc);
      g.DrawImage(folha, new Rectangle((lado - fw) / 2, (lado - fh) / 2, fw, fh), new Rectangle(mnx, mny, cw, ch), GraphicsUnit.Pixel);
      var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
      var prm = new EncoderParameters(1);
      prm.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, qualidade);
      final.Save(saida, enc, prm);
    }
    return cw + "x" + ch;
  }
}
'@

[Figuras]::Abrir($cartaz)

# painel: id da missão, x da 1ª carta, distância entre cartas, faixa y das figuras (linha 1 e linha 2)
$paineis = @(
  @{ id = 'c-cedilha'; x = 24;   dx = 97.2; l1 = @(96, 206);  l2 = @(287, 398) },
  @{ id = 'r-rr';      x = 530;  dx = 97.5; l1 = @(97, 206);  l2 = @(288, 400) },
  @{ id = 'm-n';       x = 1042; dx = 97.0; l1 = @(98, 208);  l2 = @(292, 405) },
  @{ id = 'g-j';       x = 24;   dx = 97.2; l1 = @(592, 704); l2 = @(785, 898) },
  @{ id = 'x-ch';      x = 530;  dx = 97.5; l1 = @(595, 708); l2 = @(789, 900) },
  @{ id = 'acentos';   x = 1042; dx = 97.0; l1 = @(596, 710); l2 = @(794, 906) }
)
$n = 0
foreach ($p in $paineis) {
  for ($linha = 0; $linha -lt 2; $linha++) {
    $faixa = if ($linha -eq 0) { $p.l1 } else { $p.l2 }
    for ($c = 0; $c -lt 5; $c++) {
      $i = $linha * 5 + $c
      $x0 = [int]($p.x + $c * $p.dx + 6); $x1 = $x0 + 75
      [void][Figuras]::Recortar($x0, $faixa[0] + 2, $x1, $faixa[1] - 2, (Join-Path $saida "$($p.id)-$i.jpg"), 240, 88)
      $n++
    }
  }
}
"$n figuras salvas em $saida"
