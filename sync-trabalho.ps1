# Sincroniza a pasta de trabalho (repo PSATRABALHO) entre PCs, via git.
#
# Uso (rode dentro desta pasta):
#   .\sync-trabalho.ps1 puxar          # pega o que mudou no outro PC (git pull)
#   .\sync-trabalho.ps1 enviar         # manda o que voce mudou (add + commit + push)
#   .\sync-trabalho.ps1 enviar "minha mensagem"

param(
  [Parameter(Position = 0)]
  [ValidateSet('puxar', 'enviar')]
  [string]$Acao = 'puxar',
  [Parameter(Position = 1)]
  [string]$Mensagem
)

$ErrorActionPreference = 'Stop'
$r = $PSScriptRoot

if ($Acao -eq 'puxar') {
  Write-Host "== Puxando do GitHub (pull) ==" -ForegroundColor Cyan
  git -C $r pull
}
else {
  if (-not $Mensagem) { $Mensagem = "atualiza trabalho" }
  $mudou = git -C $r status --porcelain
  if ($mudou) {
    Write-Host "== Enviando pro GitHub (add + commit + push) ==" -ForegroundColor Cyan
    git -C $r add -A
    git -C $r commit -m $Mensagem
  }
  else {
    Write-Host "Nada novo pra enviar." -ForegroundColor DarkGray
  }
  git -C $r push
}
Write-Host "Pronto." -ForegroundColor Green
