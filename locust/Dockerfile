ARG LOCUSTIO_VERSION=2.42.2
FROM locustio/locust:${LOCUSTIO_VERSION}

# pymysql/cryptography: MySQL connectivity (locustfile_mysql.py).
# kafka-python-ng: Kafka producer connectivity (locustfile_kafka.py).
RUN pip install --no-cache-dir pymysql cryptography kafka-python-ng
