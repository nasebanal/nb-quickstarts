# Test image for pytest:test. Holds ONLY the backend's runtime dependencies.
# The source is bind-mounted at run time (see docker-compose.yml), so there is
# deliberately no `COPY . .` here: copying the source would give every code
# edit a new image ID and leave the previous image behind as an untagged
# (<none>) image on every `pytest:test`.
FROM python:3.15-slim

WORKDIR /app

# `backend` is a named build context (docker-compose.yml: additional_contexts)
# pointing at apps/backend, so only this one file enters the image and the
# layer changes only when requirements.txt does.
COPY --from=backend requirements.txt .
RUN pip install --no-cache-dir pip==26.2.1 && pip install --no-cache-dir -r requirements.txt
