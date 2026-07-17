$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$errors = [Collections.Generic.List[string]]::new()
$pages = Get-ChildItem -LiteralPath $root -Filter '*.html'

foreach ($page in $pages) {
  $html = [IO.File]::ReadAllText($page.FullName, [Text.Encoding]::UTF8)
  $ids = [regex]::Matches($html, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  $ids | Group-Object | Where-Object Count -gt 1 | ForEach-Object { $errors.Add("$($page.Name): duplicate id '$($_.Name)'") }

  foreach ($match in [regex]::Matches($html, '(?:src|href)="([^"]+)"')) {
    $value = $match.Groups[1].Value
    if ($value -match '^(https?:|tel:|mailto:|#|data:|//)') { continue }
    $local = ($value -split '[?#]')[0]
    if ($local -and -not (Test-Path -LiteralPath (Join-Path $root $local))) {
      $errors.Add("$($page.Name): missing local reference '$local'")
    }
  }

  foreach ($block in [regex]::Matches($html, '<script type="application/ld\+json">([\s\S]*?)</script>')) {
    try { $null = $block.Groups[1].Value | ConvertFrom-Json }
    catch { $errors.Add("$($page.Name): invalid JSON-LD") }
  }

  foreach ($required in @('<title>', 'name="description"', 'rel="canonical"', 'class="noscript-nav"')) {
    if (-not $html.Contains($required)) { $errors.Add("$($page.Name): missing $required") }
  }
}

try { $null = [xml][IO.File]::ReadAllText((Join-Path $root 'sitemap.xml'), [Text.Encoding]::UTF8) }
catch { $errors.Add('sitemap.xml: invalid XML') }
try { $null = [IO.File]::ReadAllText((Join-Path $root 'site.webmanifest'), [Text.Encoding]::UTF8) | ConvertFrom-Json }
catch { $errors.Add('site.webmanifest: invalid JSON') }

$active = Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object Extension -in '.html', '.js', '.css', '.xml'
foreach ($file in $active) {
  $text = [IO.File]::ReadAllText($file.FullName, [Text.Encoding]::UTF8)
  if ($text -match 'cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|assets/images/more-than-kiosk/') {
    $errors.Add("$($file.Name): forbidden external or legacy asset reference")
  }
}

if ($errors.Count) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "Validation passed: $($pages.Count) HTML pages, local assets, JSON-LD, sitemap, manifest and self-hosting policy."
