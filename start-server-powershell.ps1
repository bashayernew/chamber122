# PowerShell HTTP Server for Chamber122
$port = 8000
$url = "http://localhost:$port/"

# Create a simple HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "Server running at $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

function Get-MimeType {
    param([string]$extension)
    $mimeTypes = @{
        '.html' = 'text/html; charset=utf-8'
        '.css' = 'text/css; charset=utf-8'
        '.js' = 'application/javascript; charset=utf-8'
        '.json' = 'application/json; charset=utf-8'
        '.png' = 'image/png'
        '.jpg' = 'image/jpeg'
        '.jpeg' = 'image/jpeg'
        '.gif' = 'image/gif'
        '.svg' = 'image/svg+xml'
        '.ico' = 'image/x-icon'
        '.woff' = 'font/woff'
        '.woff2' = 'font/woff2'
        '.ttf' = 'font/ttf'
    }
    return $mimeTypes[$extension] ?? 'application/octet-stream'
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq '/') {
            $localPath = '/index.html'
        }
        
        $filePath = Join-Path $PSScriptRoot $localPath.TrimStart('/')
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeType = Get-MimeType $extension
            
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mimeType
            $response.ContentLength64 = $content.Length
            $response.StatusCode = 200
            
            if ($extension -match '\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$') {
                $response.Headers.Add('Cache-Control', 'public, max-age=31536000')
            } else {
                $response.Headers.Add('Cache-Control', 'no-cache, no-store, must-revalidate')
            }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes('<h1>404 - File Not Found</h1>')
            $response.ContentType = 'text/html'
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
}

$port = 8000
$url = "http://localhost:$port/"

# Create a simple HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "Server running at $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

function Get-MimeType {
    param([string]$extension)
    $mimeTypes = @{
        '.html' = 'text/html; charset=utf-8'
        '.css' = 'text/css; charset=utf-8'
        '.js' = 'application/javascript; charset=utf-8'
        '.json' = 'application/json; charset=utf-8'
        '.png' = 'image/png'
        '.jpg' = 'image/jpeg'
        '.jpeg' = 'image/jpeg'
        '.gif' = 'image/gif'
        '.svg' = 'image/svg+xml'
        '.ico' = 'image/x-icon'
        '.woff' = 'font/woff'
        '.woff2' = 'font/woff2'
        '.ttf' = 'font/ttf'
    }
    return $mimeTypes[$extension] ?? 'application/octet-stream'
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq '/') {
            $localPath = '/index.html'
        }
        
        $filePath = Join-Path $PSScriptRoot $localPath.TrimStart('/')
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeType = Get-MimeType $extension
            
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mimeType
            $response.ContentLength64 = $content.Length
            $response.StatusCode = 200
            
            if ($extension -match '\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$') {
                $response.Headers.Add('Cache-Control', 'public, max-age=31536000')
            } else {
                $response.Headers.Add('Cache-Control', 'no-cache, no-store, must-revalidate')
            }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes('<h1>404 - File Not Found</h1>')
            $response.ContentType = 'text/html'
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
}



