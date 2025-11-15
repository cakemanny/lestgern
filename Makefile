
.PHONY: run
run:
	open http://localhost:8000
	python3 -m http.server --bind localhost
