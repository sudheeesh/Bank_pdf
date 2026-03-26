# PowerShell Script to zip source code for client delivery
# This excludes node_modules, .cache, uploads, dist_app, input, output, tmp, and .git folders.

$projectName = "Bank_PDF_Source"
$destZip = "$projectName.zip"
$excludes = @("node_modules", "dist_app", ".cache", "uploads", "input", "output", "tmp", ".git", "bank_pdf-1.0.0-x64.nsis.7z", "*.zip")

Write-Host "Creating clean source code zip for client..." -ForegroundColor Cyan

# Select all items except those in excludes
$itemsToZip = Get-ChildItem -Path . | Where-Object { $excludes -notcontains $_.Name }

# Create the archive
Compress-Archive -LiteralPath $itemsToZip.FullName -DestinationPath $destZip -Force

Write-Host "Zip created successfully: $destZip" -ForegroundColor Green
Write-Host "The client should run 'npm install' after unzipping." -ForegroundColor Yellow
