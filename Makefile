.DEFAULT_GOAL := help
.PHONY: help dev build test test-watch lint check install

vault ?= ~/Nutstore Files/我的坚果云/云笔记

# Pass the raw path through the environment rather than shell interpolation.
export MINDMAP_STUDIO_VAULT := $(value vault)

help:
	@node scripts/install.mjs --help

dev:
	npm run dev

build:
	npm run build

test:
	npm test

test-watch:
	npm run test:watch

lint:
	npm run lint

check:
	npm run check:gates

install:
	node scripts/install.mjs
