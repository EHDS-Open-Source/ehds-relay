FROM python:3.13.12-slim

ARG APP_USER=relay
ARG USER_UID=1001
ARG USER_GID=1001

WORKDIR /app

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        libpq-dev \
        python3-dev \
        gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd -g "$USER_GID" "$APP_USER" \
    && useradd --uid "$USER_UID" --gid "$USER_GID" "$APP_USER"

COPY --chown=${APP_USER}:${APP_USER} alembic.ini ./
COPY --chown=${APP_USER}:${APP_USER} relay ./relay

USER ${USER_UID}

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

ENTRYPOINT ["uvicorn", "--factory", "relay.app:create_app", "--host", "0.0.0.0", "--port", "8000"]
