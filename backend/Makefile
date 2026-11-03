SHELL=/bin/bash
VENV ?= .venv
BIN := $(VENV)/bin

.PHONY: venv install pip_compile pip_compile_dev test check lint format typecheck migrate run openapi

venv:
	python3.13 -m venv $(VENV)
	$(BIN)/pip install --upgrade pip pip-tools

install: venv
	$(BIN)/pip install -r requirements-dev.txt
	$(BIN)/pip install --no-deps -e .

pip_compile:
	PATH=$(abspath $(BIN)):$$PATH ../scripts/pip_compile.sh .

pip_compile_dev:
	PATH=$(abspath $(BIN)):$$PATH ../scripts/pip_compile.sh . --extra=dev --output-file=requirements-dev.txt

test:
	$(BIN)/pytest

lint:
	$(BIN)/ruff check .
	$(BIN)/ruff format --check .

format:
	$(BIN)/ruff check --fix .
	$(BIN)/ruff format .

typecheck:
	$(BIN)/pyright

check: lint typecheck

# Against a local DB, e.g. the Tilt port-forward on localhost:5432
migrate:
	$(BIN)/alembic upgrade head

run:
	$(BIN)/uvicorn --factory relay.app:create_app --reload --port 8000

# Dump the OpenAPI spec for the frontend client; needs no database or running server
OPENAPI_OUT ?= ../frontend/packages/api-client/openapi.json
openapi:
	$(BIN)/python -m relay.openapi $(OPENAPI_OUT)
