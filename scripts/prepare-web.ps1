$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root 'www'

if (Test-Path $www) {
    Remove-Item $www -Recurse -Force
}
New-Item -ItemType Directory -Path $www | Out-Null

Get-ChildItem -Path $root -Filter '*.html' -File | Copy-Item -Destination $www -Force

foreach ($folder in @('css', 'js')) {
    $source = Join-Path $root $folder
    if (Test-Path $source) {
        Copy-Item $source -Destination $www -Recurse -Force
    }
}

foreach ($file in @('favicon.svg')) {
    $source = Join-Path $root $file
    if (Test-Path $source) {
        Copy-Item $source -Destination $www -Force
    }
}

Write-Host "DFNS web assets prepared in $www"
