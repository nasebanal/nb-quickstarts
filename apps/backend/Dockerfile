FROM python:3.15-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir pip==26.2.1 && pip install --no-cache-dir -r requirements.txt

# No `COPY . .`: docker-compose.yml bind-mounts the source (./backend:/app), so a
# copy is never used - and it would give every code edit a new image ID and
# leave the previous image behind as an untagged (<none>) image on each
# `apps:up`. The layer above changes only when requirements.txt does.

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
