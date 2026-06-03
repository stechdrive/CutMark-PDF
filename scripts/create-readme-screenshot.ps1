param(
  [string]$TemplateFile = "img\screenshot-template.png",
  [string]$OutputFile = "img\screenshot.jpg",
  [int]$Port = 3000,
  [int]$ViewportWidth = 1200,
  [int]$ViewportHeight = 1250,
  [double]$DeviceScaleFactor = 1.25,
  [string]$PlaywrightVersion = "1.60.0",
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Resolve-Path -LiteralPath (Join-Path $repoRoot $TemplateFile)
$outputDirectory = Split-Path -Parent (Join-Path $repoRoot $OutputFile)
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$resolvedOutputDirectory = (Resolve-Path -LiteralPath $outputDirectory).Path

if (-not $resolvedOutputDirectory.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output directory resolved outside repository: $resolvedOutputDirectory"
}

$browserCandidates = @(
  $env:CHROME_PATH,
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$browserPath = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browserPath) {
  throw "Chrome or Edge was not found. Set CHROME_PATH to a browser executable."
}

$runnerDir = Join-Path $repoRoot ".local-docs\playwright-runner"
New-Item -ItemType Directory -Force -Path $runnerDir | Out-Null

$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
& npm install --prefix $runnerDir --no-save --no-package-lock "playwright@$PlaywrightVersion"

function Test-DevServerReady {
  param([int]$ServerPort)

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$ServerPort" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

$startedServer = $null
if (-not (Test-DevServerReady $Port)) {
  $npmExecutable = Get-Command npm.cmd -ErrorAction SilentlyContinue
  $npmCommand = if ($npmExecutable) { $npmExecutable.Source } else { $null }
  if (-not $npmCommand) {
    $npmCommand = (Get-Command npm -ErrorAction Stop).Source
  }

  $startedServer = Start-Process -FilePath $npmCommand `
    -ArgumentList @("run", "dev:web", "--", "--host", "127.0.0.1", "--port", "$Port") `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru
}

try {
  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Test-DevServerReady $Port)) {
    if ((Get-Date) -ge $deadline) {
      throw "Vite dev server did not become ready on port $Port"
    }
    Start-Sleep -Milliseconds 500
  }

  $scriptPath = Join-Path $repoRoot ".local-docs\create-readme-screenshot.cjs"
  $playwrightModule = (Join-Path $runnerDir "node_modules\playwright") -replace "\\", "/"
  $nodeScript = @'
const { chromium } = require('__PLAYWRIGHT_MODULE__');

const repoRoot = process.argv[2];
const browserPath = process.argv[3];
const templatePath = process.argv[4];
const outputPath = process.argv[5];
const port = Number(process.argv[6]);
const viewportWidth = Number(process.argv[7]);
const viewportHeight = Number(process.argv[8]);
const deviceScaleFactor = Number(process.argv[9]);
const headless = process.argv[10] === 'true';

(async () => {
  const browser = await chromium.launch({
    headless,
    executablePath: browserPath,
    args: ['--force-device-scale-factor=' + deviceScaleFactor],
  });

  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor,
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:` + port + `/CutMark-PDF/`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(templatePath);
  await page.waitForSelector('img[alt="Current page"]', { timeout: 15000 });
  await page.waitForTimeout(500);

  const canvas = page.locator('.pdf-page-container');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });

  const clickAt = async (xRatio, yRatio) => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Preview canvas not found');
    await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
    await page.waitForTimeout(150);
  };

  const toggleBranch = async () => {
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        /^(OFF|ON \([A-Z]\))$/.test(candidate.textContent?.trim() ?? '')
      );
      if (!button) {
        throw new Error('A-B branch toggle button was not found');
      }
      button.click();
    });
    await page.waitForTimeout(150);
  };

  // Standard 5-row template, snap ON, white background OFF, outline 2px.
  // Result: 001 / 002 / 003A / 003B / 004, with next number set to 5.
  await clickAt(0.07, 0.17); // 001
  await clickAt(0.07, 0.33); // 002
  await toggleBranch();
  await clickAt(0.07, 0.50); // 003 A
  await clickAt(0.07, 0.66); // 003 B
  await toggleBranch();
  await clickAt(0.07, 0.83); // 004

  await page.waitForFunction(
    () => document.querySelector('.pdf-page-container')?.textContent?.includes('004'),
    null,
    { timeout: 15000 }
  );
  await page.mouse.move(viewportWidth - 80, 120);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 92, fullPage: false });
  await browser.close();
})();
'@

  $nodeScript = $nodeScript.Replace("__PLAYWRIGHT_MODULE__", $playwrightModule)

  Set-Content -LiteralPath $scriptPath -Value $nodeScript -Encoding UTF8

  $headlessArg = if ($Headless) { "true" } else { "false" }
  & node $scriptPath `
    $repoRoot `
    $browserPath `
    $templatePath.Path `
    (Join-Path $repoRoot $OutputFile) `
    $Port `
    $ViewportWidth `
    $ViewportHeight `
    $DeviceScaleFactor `
    $headlessArg

  if ($LASTEXITCODE -ne 0) {
    throw "README screenshot browser automation failed with exit code $LASTEXITCODE"
  }
}
finally {
  if ($startedServer -and -not $startedServer.HasExited) {
    Stop-Process -Id $startedServer.Id -Force
  }
}

Write-Output "Wrote $(Join-Path $repoRoot $OutputFile)"
