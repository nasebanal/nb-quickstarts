ARG LOCUSTIO_VERSION=2.46.7
FROM locustio/locust:${LOCUSTIO_VERSION}

# Installed from requirements.txt so the versions are pinned in one place
# (pymysql/cryptography: MySQL scenario, kafka-python-ng: Kafka scenario).
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
