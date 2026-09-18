#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### ZAP (OWASP ZAP - web app vulnerability scanning against the running apps) ###################
# Deliberately scoped to apps/frontend and apps/backend only - zap:full-scan
# sends real attack payloads (SQLi/XSS/etc. probes), so it must never be
# pointed at an external host the way other test tools' target-host env
# vars can be (see AGENTS.md's "Test/verification tool modules").

zap:
	@echo "🚀 OWASP ZAP"
	@echo "OWASP ZAP - open-source web app vulnerability scanner (DAST). Here scanning apps/frontend and apps/backend, not an external host - see the note below."
	@echo ""
	@echo "Scans (all one-shot, all require apps:up first):"
	@echo "  zap:baseline  - Passive scan of apps/frontend (safe - spiders + observes, never attacks, ~1-2 min)"
	@echo "  zap:full-scan - Active scan of apps/frontend (sends real attack payloads - takes longer, several minutes+)"
	@echo "  zap:api-scan  - Scans apps/backend's REST API directly from its live OpenAPI schema (active, endpoint-aware)"
	@echo "  zap:scan      - Runs all three above in sequence, stops at the first one that fails"
	@echo ""
	@echo "  zap:stop      - Kill a scan that's already running (Ctrl+C on its own terminal works"
	@echo "                  too, but a scan started elsewhere - another shell, a background job -"
	@echo "                  needs this instead; also cleans up the container docker compose run"
	@echo "                  --rm would otherwise leave behind after a hard kill)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  ZAP_VERSION=2.17.0 # zaproxy/zap-stable image tag"
	@echo ""
	@echo "Reports: zap/report/<scan>-report.html (also .json)"
	@echo ""
	@echo "Note: exits non-zero if ZAP finds a real (non-INFO) alert - same"
	@echo "      pass/fail convention as pytest/specmatic, see the report for"
	@echo "      details. zap:full-scan/zap:api-scan send actual attack"
	@echo "      payloads (SQLi, XSS, ...) - only ever run these against apps"
	@echo "      (this repo's own bundled test target), never a real site."
	@echo ""
	@echo "Note: apps/frontend runs Next.js in dev mode (Turbopack), which"
	@echo "      recompiles/rewrites its cache on unusual requests - a"
	@echo "      zap:full-scan sending enough attack payloads at its many"
	@echo "      hashed _next/static/* asset URLs can pin the frontend"
	@echo "      container's CPU into a runaway loop that doesn't recover"
	@echo "      on its own even after the scan is stopped. If apps/frontend"
	@echo "      seems stuck after a full-scan, restart just that container:"
	@echo "      docker compose -p apps -f apps/docker-compose.yml restart frontend"

zap\:%:
	@$(MAKE) zap-$(subst zap:,,$@)

#################### ZAP ACTIONS ###################

zap-baseline: apps-network-ensure
	@echo "Running ZAP baseline scan (passive) against apps/frontend..."
	@mkdir -p zap/report
	@docker compose -p zap -f zap/docker-compose.yml run --rm zap \
		zap-baseline.py -t http://frontend:5173 \
		-r baseline-report.html -J baseline-report.json -I
	@echo "Report: zap/report/baseline-report.html"

zap-full-scan: apps-network-ensure
	@echo "⚠️  Running ZAP full scan (ACTIVE - sends real attack payloads) against apps/frontend..."
	@mkdir -p zap/report
	@docker compose -p zap -f zap/docker-compose.yml run --rm zap \
		zap-full-scan.py -t http://frontend:5173 \
		-r full-scan-report.html -J full-scan-report.json -I
	@echo "Report: zap/report/full-scan-report.html"

# Ctrl+C on the terminal running zap:baseline/full-scan/api-scan/scan
# already stops it (docker compose run forwards SIGINT, and --rm cleans up
# the container) - this is for when that's not an option: the scan was
# started in another shell or backgrounded. `docker compose kill/rm
# <service>` doesn't reliably reach a `docker compose run` container the
# way it does one started by `up` (confirmed: it left a live "zap-zap-run-*"
# container untouched) - so this targets by the
# `com.docker.compose.project=zap` label directly instead, which every
# container this module ever creates carries regardless of run/up. `docker
# kill` (SIGKILL, not a graceful stop) is deliberate - a scan mid-attack
# won't necessarily respond to a polite stop request either way, and this
# needs to work even against an unresponsive container.
zap-stop:
	@echo "Stopping any running ZAP scan..."
	@docker ps -q --filter "label=com.docker.compose.project=zap" | xargs -r docker kill >/dev/null
	@docker ps -aq --filter "label=com.docker.compose.project=zap" | xargs -r docker rm -f >/dev/null
	@echo "Stopped. If apps/frontend seems unresponsive afterward (a full-scan"
	@echo "left its dev server pegged - see the note above), restart it:"
	@echo "  docker compose -p apps -f apps/docker-compose.yml restart frontend"

zap-api-scan: apps-network-ensure
	@echo "⚠️  Running ZAP API scan (active) against apps/backend's live OpenAPI schema..."
	@mkdir -p zap/report
	@docker compose -p zap -f zap/docker-compose.yml run --rm zap \
		zap-api-scan.py -t http://backend:8080/openapi.json -f openapi \
		-r api-scan-report.html -J api-scan-report.json -I
	@echo "Report: zap/report/api-scan-report.html"

# Runs the same three scans as `zap:baseline`/`zap:full-scan`/`zap:api-scan`
# individually, in one shot - each is its own `$(MAKE)` call (not a single
# recipe with all three commands inline) so a real (non-INFO) finding in an
# earlier scan stops the rest, same as `all:test` stopping at the first
# tool that fails. Not part of `all:test` itself - see zap/Makefile's own
# module comment (and AGENTS.md's ZAP bullet) for why.
zap-scan:
	@$(MAKE) zap-baseline
	@$(MAKE) zap-full-scan
	@$(MAKE) zap-api-scan
	@echo ""
	@echo "All three scans passed. Reports: zap/report/{baseline,full-scan,api-scan}-report.html"
