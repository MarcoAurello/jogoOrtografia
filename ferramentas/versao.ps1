# Troca a versão do jogo de uma vez: o ?v= dos arquivos no index.html e no service-worker.js
# (e nos imports dos módulos em js/), e a VERSAO do cache, para os aparelhos baixarem a versão nova.
# Uso: powershell -ExecutionPolicy Bypass -File ferramentas\versao.ps1        (soma 1)
#      powershell -ExecutionPolicy Bypass -File ferramentas\versao.ps1 20     (usa a 20)
param([int]$Nova = 0)

$raiz = Split-Path $PSScriptRoot -Parent
$sw = Join-Path $raiz 'service-worker.js'
$html = Join-Path $raiz 'index.html'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # sem BOM, como os arquivos do jogo

# a versão atual vem da VERSAO do service-worker.js
$textoSw = [IO.File]::ReadAllText($sw, $utf8)
$achou = [regex]::Match($textoSw, "const VERSAO = 'ortografia-pleno-v(\d+)'")
if (-not $achou.Success) { Write-Error 'Nao achei a VERSAO no service-worker.js'; exit 1 }
$atual = [int]$achou.Groups[1].Value
if ($Nova -eq 0) { $Nova = $atual + 1 }

$modulos = @(Get-ChildItem (Join-Path $raiz 'js') -Filter *.js | ForEach-Object { $_.FullName })
foreach ($arquivo in @($html, $sw) + $modulos) {
  $texto = [IO.File]::ReadAllText($arquivo, $utf8)
  $texto = [regex]::Replace($texto, '(\.(css|js)\?v=)\d+', "`${1}$Nova")
  $texto = [regex]::Replace($texto, "(const VERSAO = 'ortografia-pleno-v)\d+'", "`${1}$Nova'")
  [IO.File]::WriteAllText($arquivo, $texto, $utf8)
}

Write-Host "Versao do jogo: v$atual -> v$Nova (index.html, service-worker.js e js/*.js)"
