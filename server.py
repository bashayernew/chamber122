#!/usr/bin/env python3
"""
Custom HTTP Server with proper Content-Type headers
Fixes compatibility issues with webhint.io recommendations
"""

import http.server
import socketserver
import mimetypes
import os
from urllib.parse import urlparse

# Add proper MIME types (without charset for better compatibility)
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')
mimetypes.add_type('font/ttf', '.ttf')
mimetypes.add_type('image/svg+xml', '.svg')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        
        # Don't send X-XSS-Protection (deprecated)
        # Don't send X-Frame-Options (use CSP frame-ancestors instead)
        
        super().end_headers()

    def guess_type(self, path):
        """Override to ensure proper charset for text files"""
        mimetype, encoding = mimetypes.guess_type(path)
        
        if mimetype:
            # Add charset=utf-8 for text files only
            if mimetype.startswith('text/') or mimetype in [
                'application/javascript',
                'application/json',
                'application/xml'
            ]:
                if 'charset=' not in mimetype:
                    mimetype += '; charset=utf-8'
        
        return mimetype, encoding

    def send_head(self):
        """Override to set proper Content-Type headers"""
        path = self.translate_path(self.path)
        f = None
        
        if os.path.isdir(path):
            parts = urlparse(self.path)
            if not parts.path.endswith('/'):
                # redirect browser - doing basically what apache does
                self.send_response(301)
                self.send_header("Location", parts.path + "/")
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index = os.path.join(path, index)
                if os.path.exists(index):
                    path = index
                    break
            else:
                return self.list_directory(path)
        
        ctype = self.guess_type(path)[0]
        if ctype is None:
            ctype = 'application/octet-stream'
        
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None
        
        try:
            self.send_response(200)
            self.send_header("Content-type", ctype)
            fs = os.fstat(f.fileno())
            self.send_header("Content-Length", str(fs[6]))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            
            # Set cache headers based on file type
            if path.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2')):
                self.send_header("Cache-Control", "public, max-age=31536000")
            else:
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
            
            self.end_headers()
            return f
        except:
            f.close()
            raise

if __name__ == "__main__":
    PORT = 8004
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
