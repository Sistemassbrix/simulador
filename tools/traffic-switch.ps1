param([switch]$ApproveTrafficSwitch,[switch]$Rollback,[string]$BackupPath)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$proxyPath = 'C:\Produccion\nexust\proxy\default.conf'
function Write-ProxyConfig([string]$SourcePath) {
    try { Copy-Item -LiteralPath $SourcePath -Destination $proxyPath -Force }
    catch [System.UnauthorizedAccessException] {
        node (Join-Path $projectPath 'tools\write-proxy.mjs') $SourcePath
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar el archivo persistente del proxy mediante su montaje.' }
    }
}
if (-not $ApproveTrafficSwitch) { throw 'Requiere aprobación explícita del cambio de tráfico: -ApproveTrafficSwitch.' }
if ($Rollback) {
    if (-not $BackupPath) { throw 'Indique -BackupPath con la copia de configuración anterior.' }
    $restorePath = (Resolve-Path -LiteralPath $BackupPath).Path
    $privatePath = (Resolve-Path (Join-Path $projectPath 'private')).Path + '\'
    if (-not $restorePath.StartsWith($privatePath,[StringComparison]::OrdinalIgnoreCase)) { throw 'El respaldo debe estar dentro de private del proyecto.' }
    Write-ProxyConfig $restorePath
    docker exec nexust-proxy nginx -t
    if ($LASTEXITCODE -ne 0) { throw 'La configuración de reversión no pasó nginx -t.' }
    docker exec nexust-proxy nginx -s reload
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo recargar el proxy.' }
    return
}
$originalPath = Join-Path $projectPath 'private\proxy-original.conf'
if ((Get-FileHash -LiteralPath $proxyPath).Hash -ne (Get-FileHash -LiteralPath $originalPath).Hash) { throw 'El proxy cambió desde el análisis; preparar una propuesta nueva conservando las reglas actuales.' }
$preview = Invoke-WebRequest 'http://127.0.0.1:8282/' -UseBasicParsing
if ($preview.StatusCode -ne 200) { throw 'La versión paralela no está disponible.' }
Push-Location $projectPath
try {
    node tools/assert-source-current.mjs
    if ($LASTEXITCODE -ne 0) { throw 'La fuente original debe reconciliarse antes de cambiar el tráfico.' }
    & (Join-Path $projectPath 'tools\backup.ps1') -Label pre-switch
} finally { Pop-Location }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$savedPath = Join-Path $projectPath "private\proxy-backup-$stamp.conf"
Copy-Item -LiteralPath $proxyPath -Destination $savedPath
Write-ProxyConfig (Join-Path $projectPath 'deployment\proxy-proposed.conf')
docker exec nexust-proxy nginx -t
if ($LASTEXITCODE -ne 0) { Write-ProxyConfig $savedPath; throw 'nginx -t falló; se restauró el archivo anterior sin recargar tráfico.' }
docker exec nexust-proxy nginx -s reload
if ($LASTEXITCODE -ne 0) { Write-ProxyConfig $savedPath; docker exec nexust-proxy nginx -s reload; throw 'Recarga fallida; restaurado el proxy anterior.' }
Write-Output "Tráfico cambiado. Reversión: .\tools\traffic-switch.ps1 -ApproveTrafficSwitch -Rollback -BackupPath '$savedPath'"
