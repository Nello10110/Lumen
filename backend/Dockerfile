# Image publiée par la CI et tirée par le `compose.yaml` à la racine du dépôt —
# même version de Python que l'environnement de développement.
FROM python:3.14-slim

# Client PostgreSQL 16 (pg_dump, pg_restore, psql) pour la sauvegarde sous Postgres
# (§ BK.1) : de la MÊME version que le serveur du compose. Celui de Debian (17)
# écrit des archives que `pg_restore` rejoue avec des réglages inconnus d'un
# serveur 16 (`transaction_timeout`) — la restauration échouerait. D'où le dépôt
# officiel du projet PostgreSQL (procédure de postgresql.org/download/linux/debian).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-16 \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# --host 0.0.0.0 est nécessaire pour être joignable DEPUIS Docker Compose (le
# service frontend, ou l'hôte) — la restriction "pas exposé publiquement" se fait
# au niveau de la publication du port sur l'hôte (127.0.0.1:8000:8000 dans le
# compose), pas ici.
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
