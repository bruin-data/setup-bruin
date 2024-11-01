# See https://tech.davis-hansson.com/p/make/
SHELL := bash
.DELETE_ON_ERROR:
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-print-directory
BIN := .tmp/bin
COPYRIGHT_YEARS := 2020-2024
LICENSE_IGNORE := -e dist\/

UNAME_OS := $(shell uname -s)

ifeq ($(UNAME_OS),Darwin)
SED_I := sed -i ''
else
SED_I := sed -i
endif

PHONY: all
all: ## Format, Lint and build (default)
	$(MAKE) build

.PHONY: format
format: node_modules
	npm run format

.PHONY: lint
lint: node_modules
	npm run lint

.PHONY: build
build: node_modules format lint
	npm run build

.PHONY: updateversion
updateversion:
ifndef VERSION
	$(error "VERSION must be set")
endif
	$(SED_I) "s/default: '[0-9].[0-9][0-9]*\.[0-9][0-9]*[-rc0-9]*'/default: '$(VERSION)'/g" action.yml
	$(SED_I) "s/[0-9].[0-9][0-9]*\.[0-9][0-9]*[-rc0-9]*/$(VERSION)/g" README.md


.PHONY: checkgenerate
checkgenerate:
	@# Used in CI to verify that `make generate` doesn't produce a diff.
	test -z "$$(git status --porcelain | tee /dev/stderr)"

node_modules: package-lock.json
	npm ci
