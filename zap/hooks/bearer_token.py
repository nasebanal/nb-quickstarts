"""ZAP hook: sends `Authorization: Bearer <ZAP_BEARER_TOKEN>` with every request the scan makes.

The whole API needs an access token now, so without this the active scan would only ever see 401s.
zap-api-scan.py loads this file with `--hook` and calls `zap_started` once ZAP is up; the rule goes
in through ZAP's Replacer add-on (a header-replacement rule applied to every request).
"""

import os


def zap_started(zap, target):
    token = os.environ.get("ZAP_BEARER_TOKEN", "")
    if not token:
        print("bearer_token hook: ZAP_BEARER_TOKEN is empty - the scan runs unauthenticated")
        return
    zap.replacer.add_rule(
        description="bearer token",
        enabled="true",
        matchtype="REQ_HEADER",
        matchregex="false",
        matchstring="Authorization",
        replacement=f"Bearer {token}",
    )
    print("bearer_token hook: Authorization header rule added")
