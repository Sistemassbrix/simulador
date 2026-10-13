param([string]$Label='manual')
$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupRoot=Join-Path $projectPath ('private\backups\'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+$Label)
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
docker exec simulador-modern-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/simulador-backup.dump'
if($LASTEXITCODE -ne 0){throw 'pg_dump falló'}
docker cp simulador-modern-db:/tmp/simulador-backup.dump (Join-Path $backupRoot 'postgres.dump')
if($LASTEXITCODE -ne 0){throw 'No se pudo copiar el respaldo'}
Copy-Item -LiteralPath (Join-Path $projectPath '.env') -Destination $backupRoot
Copy-Item -LiteralPath 'C:\Produccion\nexust\proxy\default.conf' -Destination (Join-Path $backupRoot 'proxy.conf')
Get-FileHash -LiteralPath (Join-Path $backupRoot 'postgres.dump') | Format-List | Out-File (Join-Path $backupRoot 'checksum.txt') -Encoding utf8
Write-Output "Respaldo privado: $backupRoot"
