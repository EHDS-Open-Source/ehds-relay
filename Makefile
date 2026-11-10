SHELL=/bin/bash

.PHONY: cluster up down deploy tilt web install pip_compile pip_compile_dev api_client test check check_password_flows

# make cluster up | make cluster down [--remove-registries]
cluster:
	@./scripts/cluster.sh $(filter-out $@,$(MAKECMDGOALS))

up down:
	@:

deploy:
	./scripts/deploy.sh

tilt:
	tilt up

# Frontend dev server (Vite), proxying the API
web:
	$(MAKE) -C frontend dev

install:
	$(MAKE) -C backend install
	$(MAKE) -C frontend install

pip_compile:
	$(MAKE) -C backend pip_compile

pip_compile_dev:
	$(MAKE) -C backend pip_compile_dev

# Dump the OpenAPI spec from the backend and regenerate the typed frontend client
api_client:
	$(MAKE) -C backend openapi
	$(MAKE) -C frontend api_client

test:
	$(MAKE) -C backend test
	$(MAKE) -C frontend test

check:
	$(MAKE) -C backend check
	$(MAKE) -C frontend check

# End-to-end check of registration, password reset and change against the running stack (Tilt).
# Not part of `make test`. Add ARGS=--check-expiry to also wait for a reset link to expire.
check_password_flows:
	set -a; [ -f .dev.env ] && . ./.dev.env; set +a; \
	backend/.venv/bin/python scripts/check_password_flows.py $(ARGS)
