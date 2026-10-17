"""Get a Google refresh token for AIMORO's Drive + Sheets sync. Run once, on your own computer.

    cd backend
    GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... python scripts/google_auth.py

A browser opens; sign in as the Google account that owns the AIMORO Drive folder and allow
access. The script prints GOOGLE_REFRESH_TOKEN. Paste it into Render's environment settings.
Never commit it to git.
"""
import http.server
import os
import secrets
import sys
import threading
import urllib.parse
import webbrowser

import httpx

PORT = 8765
REDIRECT = f"http://127.0.0.1:{PORT}/"
SCOPES = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets"


def main() -> None:
    client_id = os.getenv("GOOGLE_CLIENT_ID") or input("GOOGLE_CLIENT_ID: ").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET") or input("GOOGLE_CLIENT_SECRET: ").strip()
    state = secrets.token_urlsafe(16)
    result: dict = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            qs = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
            if qs.get("state") == state:
                result.update(qs)
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h2>Done. You can close this tab and go back to the terminal.</h2>")
            threading.Thread(target=server.shutdown, daemon=True).start()

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": REDIRECT, "response_type": "code", "scope": SCOPES,
        "access_type": "offline", "prompt": "consent", "state": state,
    })
    print("Opening your browser. If it doesn't open, visit:\n" + url)
    webbrowser.open(url)
    server.serve_forever()

    if "code" not in result:
        sys.exit(f"No authorisation code received: {result.get('error', 'unknown error')}")
    r = httpx.post("https://oauth2.googleapis.com/token", data={
        "code": result["code"], "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": REDIRECT, "grant_type": "authorization_code",
    }, timeout=30)
    r.raise_for_status()
    token = r.json().get("refresh_token")
    if not token:
        sys.exit("Google did not return a refresh token. Remove the app's access at "
                 "https://myaccount.google.com/permissions and run this again.")
    print("\nAdd this to Render (aimoro-backend > Environment):\n")
    print(f"GOOGLE_REFRESH_TOKEN={token}\n")


if __name__ == "__main__":
    main()
