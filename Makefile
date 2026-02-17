.PHONY: dev backend frontend install dev-venv backend-venv frontend-venv install-venv

# --- Conda targets ---

CONDA_RUN = conda run -n unsloth --no-capture-output

dev: backend frontend

backend:
	$(CONDA_RUN) uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --reload-exclude "unsloth_compiled_cache/*" --reload-exclude "data/*" --reload-exclude "frontend/*"

frontend:
	cd frontend && $(CONDA_RUN) npm run dev

install:
	$(CONDA_RUN) pip install -r requirements.txt
	cd frontend && $(CONDA_RUN) npm install

# --- Venv targets ---

VENV = . .venv/bin/activate &&

dev-venv: backend-venv frontend-venv

backend-venv:
	$(VENV) uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --reload-exclude "unsloth_compiled_cache/*" --reload-exclude "data/*" --reload-exclude "frontend/*"

frontend-venv:
	cd frontend && npm run dev

install-venv:
	$(VENV) pip install -r requirements.txt
	cd frontend && npm install
