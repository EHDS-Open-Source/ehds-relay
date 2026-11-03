SHELL=/bin/bash

.PHONY: cluster up down deploy tilt web install pip_compile pip_compile_dev test check

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

test:
	$(MAKE) -C backend test
	$(MAKE) -C frontend test

check:
	$(MAKE) -C backend check
	$(MAKE) -C frontend check
