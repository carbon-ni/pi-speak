.PHONY: all install lint typecheck test test-watch smoke hooks

all: lint test

install:
	npm install

typecheck:
	npm run typecheck

lint:
	npm run lint

test:
	npm test

test-watch:
	npm test -- --watch

smoke:
	npm run pi-speak -- --help


hooks:
	pre-commit install
