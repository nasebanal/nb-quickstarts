#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### EVOLUTION (NASEBANAL API catalog) ###################
# Registers the shared OpenAPI contract (shared/openapi/openapi.yaml) in the NASEBANAL Evolution catalog
# (nb specs specs push) as the spec every `<module>:report-upload` reports to.
# Runs the nb CLI on your host; apps:up is not needed (the contract is a file).


evolution:
	@echo "🚀 Evolution"
	@echo "NASEBANAL Evolution - the API catalog the test reports are filed under (register the shared OpenAPI contract as a spec)."
	@echo ""
	@echo "Sign-in:"
	@echo "  evolution:login    - Sign in to NASEBANAL (opens the browser; nb auth login)"
	@echo "  evolution:logout   - Sign out: removes nb's stored credentials (shared by every use of nb on this machine)"
	@echo ""
	@echo "Catalog Management:"
	@echo "  evolution:check    - Show the signed-in session and user, and what evolution:register would do (writes nothing)"
	@echo "  evolution:register - Register shared/openapi/openapi.yaml as the catalog spec (safe to repeat)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  NB_REPOSITORY=nasebanal/nb-quickstarts # Catalog repository (owner/name) - set your own to use your own catalog"
	@echo "  NB_SPEC=<info.title>                   # Spec name in the catalog (default: the contract's title, NASEBANAL Quickstarts API)"
	@echo "  NB_GROUP=                              # Optional: catalog group to file the spec in (default: none)"
	@echo "  NB_SPECS_ORG=                          # Optional: organization whose catalog it is (default: personal)"
	@echo "  NB_TOKEN=                              # Optional: PAT / service-account token (default: nb auth login)"
	@echo ""
	@echo "Note: run evolution:check first. evolution:register sends shared/openapi/openapi.yaml (apps:up is not needed)"
	@echo "      and opens the NASEBANAL login if you are not signed in. Run it once; after that"
	@echo "      make all:test && make all:report-upload files the reports under that spec."
	@echo "      Needs nb on PATH (npm i -g @nasebanal/cli)."

evolution\:%:
	@$(MAKE) evolution-$(subst evolution:,,$@)

#################### EVOLUTION ACTIONS ###################

evolution-login:
	@bin/evolution_auth.sh login

evolution-logout:
	@bin/evolution_auth.sh logout

evolution-register:
	@bin/evolution_register.sh

evolution-check:
	@bin/evolution_register.sh --dry-run
