FROM python:3.11-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/
RUN apt-get update && apt-get install -y --no-install-recommends curl libgomp1 postgresql \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml uv.lock README.md .python-version ./
RUN uv sync --locked --no-dev
COPY backend backend
COPY data data
COPY supabase supabase
RUN useradd --system --create-home vaani
USER vaani
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "backend.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
