# Generate app icons (192 / 512 / maskable 512) for SpeedMath PWA
# Usage: powershell -File scripts\gen-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-AppIcon {
    param(
        [int]$Size,
        [string]$OutFile,
        [bool]$FullBleed = $false   # maskable icons must fill the whole canvas
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $radius = 0
    if (-not $FullBleed) { $radius = [int]($Size * 0.22) }

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 79, 70, 229),
        [System.Drawing.Color]::FromArgb(255, 124, 58, 237),
        135
    )

    if ($radius -gt 0) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
        $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
        $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($brush, $path)
        $path.Dispose()
    } else {
        $g.FillRectangle($brush, $rect)
    }

    $ratio = 0.52
    if ($FullBleed) { $ratio = 0.42 }
    $fontSize = [int]($Size * $ratio)
    $font = New-Object System.Drawing.Font('Microsoft YaHei', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString([char]0x7B97, $font, [System.Drawing.Brushes]::White, $rect, $sf)

    $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $font.Dispose(); $brush.Dispose()
    Write-Output "generated: $OutFile"
}

New-AppIcon -Size 192 -OutFile (Join-Path $outDir 'icon-192.png')
New-AppIcon -Size 512 -OutFile (Join-Path $outDir 'icon-512.png')
New-AppIcon -Size 512 -OutFile (Join-Path $outDir 'icon-maskable-512.png') -FullBleed $true
