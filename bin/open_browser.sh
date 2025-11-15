#!/bin/bash
#
# Cross-platform browser opener
# Usage: open_browser.sh <URL>
#

if [ -z "$1" ]; then
    echo "Error: URL is required"
    echo "Usage: $0 <URL>"
    exit 1
fi

URL="$1"

echo "Opening $URL in browser..."

# Try different methods based on the platform
if command -v explorer.exe >/dev/null 2>&1; then
    # WSL (Windows Subsystem for Linux)
    explorer.exe "$URL" 2>/dev/null || echo "WSL detected. Please open $URL in your browser"
elif command -v open >/dev/null 2>&1; then
    # macOS
    open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux with xdg-utils
    xdg-open "$URL"
else
    # Fallback: just display the URL
    echo "Please open $URL in your browser"
fi
