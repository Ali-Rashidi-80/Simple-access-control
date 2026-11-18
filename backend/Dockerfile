# SentryGate Backend — Chabokan mirrors
FROM mirror2.chabokan.net/library/python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_INDEX_URL=https://mirror2.chabokan.net/pypi/simple/ \
    PIP_TRUSTED_HOST="mirror2.chabokan.net pypi.org files.pythonhosted.org" \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=5 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_PREFER_BINARY=1

RUN rm -f /etc/apt/sources.list.d/debian.sources && \
    echo "deb [trusted=yes] https://mirror2.chabokan.net/debian bookworm main contrib non-free" > /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://mirror2.chabokan.net/debian bookworm-updates main contrib non-free" >> /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://mirror2.chabokan.net/debian bookworm-security main contrib non-free" >> /etc/apt/sources.list && \
    echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99-mirror-tuning && \
    echo 'Acquire::Retries "3";' >> /etc/apt/apt.conf.d/99-mirror-tuning && \
    echo 'Acquire::http::Timeout "120";' >> /etc/apt/apt.conf.d/99-mirror-tuning

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        netcat-openbsd \
        libpq5 \
        postgresql-client \
        dos2unix \
        bash \
    && rm -rf /var/lib/apt/lists/*

COPY pip.conf requirements.txt ./
RUN cp pip.conf /etc/pip.conf

RUN bash -euxo pipefail -c '\
      python -m pip install --upgrade pip setuptools wheel; \
      python -m pip install --no-cache-dir -r requirements.txt \
      || { echo ">>> Chabokan mirror miss; falling back to PyPI.org..."; \
           PIP_INDEX_URL=https://pypi.org/simple/ \
           PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org" \
           python -m pip install --no-cache-dir --default-timeout=120 --retries 3 -r requirements.txt; }; \
    '

RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin appuser

COPY . .
RUN mkdir -p /app/data /app/data/uploads /app/data/uploads/avatars /app/data/backups /app/data/logs \
    && dos2unix /app/docker-entrypoint.sh 2>/dev/null || true \
    && chmod +x /app/docker-entrypoint.sh \
    && chown -R appuser:appuser /app

USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=40s \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
