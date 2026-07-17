param(
  [ValidateRange(1,100)][int]$TableCount = 12,
  [string]$SiteUrl = 'https://alexzaxa.github.io/tester/menu.html'
)
$ErrorActionPreference = 'Stop'
$rows = @()
$sql = @('-- Generated secrets: keep this file private and delete it after importing.')
for ($number = 1; $number -le $TableCount; $number++) {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  $rng.Dispose()
  $token = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $sha = [Security.Cryptography.SHA256]::Create()
  $hashBytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($token))
  $sha.Dispose()
  $hash = -join ($hashBytes | ForEach-Object { $_.ToString('x2') })
  $label = $number.ToString()
  $url = "${SiteUrl}?qr=$token"
  $rows += [pscustomobject]@{ Table = $label; Url = $url }
  $sql += "insert into public.restaurant_tables(label, qr_token_hash) values ('$label','$hash') on conflict (label) do update set qr_token_hash=excluded.qr_token_hash, enabled=true;"
}
$rows | Export-Csv -LiteralPath (Join-Path $PSScriptRoot 'table-links.csv') -NoTypeInformation -Encoding UTF8
[IO.File]::WriteAllLines((Join-Path $PSScriptRoot 'table-seed.sql'), $sql, [Text.UTF8Encoding]::new($false))
Write-Host "Created $TableCount unique table links in supabase/table-links.csv and their hashes in supabase/table-seed.sql."
