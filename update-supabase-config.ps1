# PowerShell script to update Supabase configuration
# Usage: .\update-supabase-config.ps1 -NewUrl "https://your-project.supabase.co" -NewKey "your-anon-key"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$NewKey
)

$OldUrl = "https://gidbvemmqffogakcepka.supabase.co"
$OldKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w"

Write-Host "Updating Supabase configuration..." -ForegroundColor Cyan
Write-Host "Old URL: $OldUrl" -ForegroundColor Yellow
Write-Host "New URL: $NewUrl" -ForegroundColor Green
Write-Host ""

# Find all files containing the old URL
$files = Get-ChildItem -Recurse -Include *.js,*.html,*.ts | Where-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    $content -and ($content -match [regex]::Escape($OldUrl) -or $content -match [regex]::Escape($OldKey))
}

if ($files.Count -eq 0) {
    Write-Host "No files found with old Supabase configuration." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($files.Count) files to update:" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "  - $($_.FullName)" }

$confirm = Read-Host "`nDo you want to update these files? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Update cancelled." -ForegroundColor Yellow
    exit
}

# Update files
$updated = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # Replace URL
        $content = $content -replace [regex]::Escape($OldUrl), $NewUrl
        
        # Replace key
        $content = $content -replace [regex]::Escape($OldKey), $NewKey
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "✓ Updated: $($file.Name)" -ForegroundColor Green
            $updated++
        }
    } catch {
        Write-Host "✗ Error updating $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nUpdate complete! Updated $updated files." -ForegroundColor Green
Write-Host "Please verify the changes and test your application." -ForegroundColor Cyan








