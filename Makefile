SHELL=/bin/bash

.PHONY: cluster up down deploy tilt install pip_compile pip_compile_dev test check

# make cluster up | make cluster down [--remove-registries]
cluster:
	@./scripts/cluster.sh $(filter-out $@,$(MAKECMDGOALS))

up down:
	@:

deploy:
	./scripts/deploy.sh

tilt:
	tilt up

install:
	$(MAKE) -C backend install

pip_compile:
	$(MAKE) -C backend pip_compile

pip_compile_dev:
	$(MAKE) -C backend pip_compile_dev

test:
	$(MAKE) -C backend test

check:
	$(MAKE) -C backend check
