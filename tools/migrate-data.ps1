param([string]$Source='private/active-data.json',[switch]$VerifyOnly)
$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath=(Resolve-Path -LiteralPath $Source).Path
$extension=[IO.Path]::GetExtension($sourcePath)
$containerPath='/tmp/simulador-source'+$extension
docker cp $sourcePath ('simulador-modern-api:'+$containerPath)
if($LASTEXITCODE -ne 0){throw 'No se pudo copiar la fuente privada'}
if(-not $VerifyOnly){
 docker exec --workdir /tmp simulador-modern-api /app/node_modules/.bin/tsx /app/tools/import-data.ts $containerPath
 if($LASTEXITCODE -ne 0){throw 'La importacion fue rechazada; revisar los conflictos sin sobrescribir datos'}
}
docker exec --workdir /tmp simulador-modern-api /app/node_modules/.bin/tsx /app/tools/verify-data.ts $containerPath
if($LASTEXITCODE -ne 0){throw 'La comprobacion de integridad encontro diferencias'}
docker cp simulador-modern-api:/tmp/docs/results/data-integrity.json (Join-Path $projectPath 'docs/results/data-integrity.json')
if($LASTEXITCODE -ne 0){throw 'No se pudo recuperar el informe'}
