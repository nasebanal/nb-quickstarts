"""Optional OpenTelemetry wiring.

Off unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so the default `apps:up`
behaves exactly as before. Point it at the observability module's collector
(http://otel-collector:4318) to get traces (FastAPI requests + SQLAlchemy
queries), HTTP server metrics and application logs. Standard OTEL_* env vars (OTEL_SERVICE_NAME,
OTEL_EXPORTER_OTLP_HEADERS, ...) are honored by the SDK, so the same code
can export to any OTLP backend, not just the local one.
"""

import logging
import os

from fastapi import FastAPI
from sqlalchemy.engine import Engine


class _DropNoiseFilter(logging.Filter):
    """Keeps the log stream to what is worth searching.

    uvicorn logs every request on `uvicorn.access`; shipping all of them
    would put one Loki line per request (a Kafka-fed run is millions), so
    only failed requests (status >= 400) go through. Health checks are
    dropped either way, like they are for traces and metrics.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if record.name == "uvicorn.access" and isinstance(record.args, tuple) and len(record.args) >= 5:
            path, status = str(record.args[2]), record.args[4]
            return "/health" not in path and int(status) >= 400
        return "/health" not in record.getMessage()


def setup_telemetry(app: FastAPI, engine: Engine) -> bool:
    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return False

    from opentelemetry import metrics, trace
    from opentelemetry._logs import set_logger_provider
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
        OTLPMetricExporter,
    )
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    # Resource.create() picks up OTEL_SERVICE_NAME / OTEL_RESOURCE_ATTRIBUTES.
    resource = Resource.create({"service.name": "nb-backend"})

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    metrics.set_meter_provider(
        MeterProvider(
            resource=resource,
            metric_readers=[
                PeriodicExportingMetricReader(
                    OTLPMetricExporter(), export_interval_millis=10_000
                )
            ],
        )
    )

    # Logs: a handler that turns stdlib log records into OTLP log records,
    # stamped with the active span's trace_id/span_id so Grafana can jump
    # between a log line and its trace. uvicorn's own loggers don't
    # propagate to the root logger, so the handler goes on them directly.
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))
    set_logger_provider(logger_provider)
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    handler.addFilter(_DropNoiseFilter())
    for name in ("", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

    # Health checks (compose healthchecks) would otherwise
    # drown out real traffic in every panel.
    FastAPIInstrumentor.instrument_app(app, excluded_urls="health")
    SQLAlchemyInstrumentor().instrument(engine=engine)
    return True
