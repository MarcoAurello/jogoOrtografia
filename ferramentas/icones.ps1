# Gera os ícones do app: fundo em degradê pastel, logo da Pedagogia Gamificada e "ABC" em amarelo.
# Uso: powershell -ExecutionPolicy Bypass -File ferramentas\icones.ps1
Add-Type -AssemblyName System.Drawing
$raiz = Split-Path $PSScriptRoot -Parent
$saida = Join-Path $raiz 'icons'
New-Item -ItemType Directory -Force $saida | Out-Null
$logo = [System.Drawing.Image]::FromFile((Join-Path $raiz 'assets\logo-pg.png'))

function Icone($tamanho, $escala, $arquivo, $cantos) {
  $bmp = New-Object System.Drawing.Bitmap $tamanho, $tamanho
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $area = New-Object System.Drawing.Rectangle 0, 0, $tamanho, $tamanho
  $fundo = New-Object System.Drawing.Drawing2D.LinearGradientBrush $area, ([System.Drawing.Color]::FromArgb(255, 255, 246, 199)), ([System.Drawing.Color]::FromArgb(255, 184, 216, 255)), 45
  $forma = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($cantos) {
    $r = $tamanho * 0.22
    $forma.AddArc(0, 0, $r, $r, 180, 90); $forma.AddArc($tamanho - $r, 0, $r, $r, 270, 90)
    $forma.AddArc($tamanho - $r, $tamanho - $r, $r, $r, 0, 90); $forma.AddArc(0, $tamanho - $r, $r, $r, 90, 90)
    $forma.CloseFigure()
  } else { $forma.AddRectangle($area) }
  $g.FillPath($fundo, $forma)

  # logo no alto
  $lw = $tamanho * $escala * 0.8
  $lh = $lw * $logo.Height / $logo.Width
  $fs = $tamanho * $escala * 0.26
  $bloco = $lh + $tamanho * 0.02 + $fs * 1.15
  $ly = ($tamanho - $bloco) / 2
  $g.DrawImage($logo, [float](($tamanho - $lw) / 2), [float]$ly, [float]$lw, [float]$lh)

  # "ABC" embaixo, com contorno azul-escuro

  $fonte = New-Object System.Drawing.Font('Arial Black', [float]$fs, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $caminho = New-Object System.Drawing.Drawing2D.GraphicsPath
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $caminho.AddString('ABC', $fonte.FontFamily, [int]$fonte.Style, [float]$fs, (New-Object System.Drawing.RectangleF 0, ([float]($ly + $lh + $tamanho * 0.01)), $tamanho, $tamanho), $fmt)
  $caneta = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 11, 46, 102)), ([float]($tamanho * 0.025))
  $caneta.LineJoin = 'Round'
  $g.DrawPath($caneta, $caminho)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 247, 223, 28))), $caminho)

  $bmp.Save($arquivo, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Icone 192 0.78 (Join-Path $saida 'icon-192.png') $true
Icone 512 0.78 (Join-Path $saida 'icon-512.png') $true
Icone 512 0.58 (Join-Path $saida 'icon-maskable-512.png') $false
Icone 180 0.7 (Join-Path $saida 'apple-touch-icon.png') $false
$logo.Dispose()
Get-ChildItem $saida | Select-Object Name, Length
