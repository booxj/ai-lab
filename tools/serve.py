#!/usr/bin/env python3
"""AURA 静态站点本地预览服务器（支持目录 / SPA 回退）。"""
import http.server, socketserver, os, sys, urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = "/workspace"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def translate_path(self, path):
        path = urllib.parse.urlparse(path).path
        fs = os.path.join(ROOT, path.lstrip("/"))
        if os.path.isdir(fs):
            idx = os.path.join(fs, "index.html")
            if os.path.exists(idx):
                return idx
        if not os.path.exists(fs) and not path.endswith("/"):
            return os.path.join(ROOT, "index.html")
        return fs

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"serving {ROOT} on http://127.0.0.1:{PORT}")
    httpd.serve_forever()
