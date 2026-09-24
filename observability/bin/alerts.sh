#!/bin/sh
# What Alertmanager currently holds, and what its webhook receiver got.

ALERTMANAGER="http://localhost:${ALERTMANAGER_PORT:-9095}"

echo "Alerts in Alertmanager (active):"
alerts=$(curl -s "$ALERTMANAGER/api/v2/alerts?active=true&inhibited=false" | jq -r '.[] | "  [\(.labels.severity)] \(.labels.alertname) - \(.annotations.summary)"')
if [ -n "$alerts" ]; then echo "$alerts"; else echo "  none"; fi

echo "Inhibited (suppressed by a higher-severity alert):"
inhibited=$(curl -s "$ALERTMANAGER/api/v2/alerts?active=false&inhibited=true" | jq -r '.[] | "  [\(.labels.severity)] \(.labels.alertname)"')
if [ -n "$inhibited" ]; then echo "$inhibited"; else echo "  none"; fi

echo "Notifications received by the webhook sink (last 20):"
docker logs --tail 20 nb-alert-sink 2>&1 | sed 's/^/  /'
