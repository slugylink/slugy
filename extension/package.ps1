$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$releaseRoot = (Resolve-Path (Join-Path $PSScriptRoot 'dist/chrome')).Path
$manifest = Get-Content -LiteralPath (Join-Path $releaseRoot 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.version -notmatch '^\d+(\.\d+){0,3}$') { throw 'Invalid manifest version' }
& node (Join-Path $PSScriptRoot 'verify-release.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Release validation failed' }

$archivePath = Join-Path $PSScriptRoot "dist/slugy-chrome-$($manifest.version).zip"
$stream = [IO.File]::Open($archivePath, [IO.FileMode]::Create)
try {
    $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem -LiteralPath $releaseRoot -Recurse -File | ForEach-Object {
            $entryName = $_.FullName.Substring($releaseRoot.Length + 1).Replace('\', '/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entryName) | Out-Null
        }
    } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

Write-Output "Packaged $archivePath"
