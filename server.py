#!/usr/bin/env python3
import http.server
import socketserver
import urllib.parse
import json
import os
from functools import partial

PORT = 8000
DOCUMENT_ROOT = "./www"

class LoginHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DOCUMENT_ROOT, **kwargs)

    def guess_type(self, path):
        mimetype, encoding = super().guess_type(path)
        if mimetype and mimetype.startswith('text/'):
            return mimetype + '; charset=utf-8'
        return mimetype

    def do_POST(self):
        if self.path == '/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username')
                password = data.get('password')

                if username == 'admin' and password == 'password':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'status': 'success', 'message': 'Login successful'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'status': 'error', 'message': 'Invalid credentials'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': 'Invalid JSON'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), LoginHandler) as httpd:
        print(f"Serving HTTP on port {PORT}")
        print(f"Document root: {os.path.abspath(DOCUMENT_ROOT)}")
        print(f"Access at: http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()
