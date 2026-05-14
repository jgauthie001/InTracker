$locDir = "E:\intracker\data\locations"

Get-ChildItem -Path $locDir -Filter "*.csv" | ForEach-Object {
    $file = $_.FullName
    $lines = Get-Content $file

    if ($lines.Count -eq 0) { return }

    # Keep the header, zero out the quantity column on every data row
    $newLines = @($lines[0])
    foreach ($line in ($lines | Select-Object -Skip 1)) {
        if ($line.Trim() -eq '') { continue }
        $parts = $line -split ',', 2
        $newLines += "$($parts[0]),0"
    }

    $newLines | Set-Content $file -Encoding UTF8
    Write-Host "Cleared: $($_.Name)"
}

Write-Host "`nDone. All location quantities set to 0."
