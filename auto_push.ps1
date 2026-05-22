$repoPath = $PSScriptRoot

Write-Host "Starting Auto-Push for LifeOS..."
Write-Host "Monitoring directory: $repoPath"
Write-Host "Will check for changes and push every 15 minutes. Press Ctrl+C to stop."

while ($true) {
    Set-Location $repoPath

    # Check if there are any changes
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Changes detected. Committing and pushing..."
        git add .
        git commit -m "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git push origin main
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Push successful."
    } else {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] No changes detected."
    }
    
    # Wait for 15 minutes (900 seconds)
    Start-Sleep -Seconds 900
}
