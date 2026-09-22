"""Optional OpenTelemetry wiring.

Off unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so the default `apps:up`
behaves exactly as before. Point it at the observability module's collector
(http://otel-collector:4318) to get traces (FastAPI requests + SQLAlchemy
queries) and HTTP server metrics. Standard OTEL_* env vars (OTEL_SERVICE_NAME,
OTEL_EXPORTER_OTLP_HEADERS, ...) are honored by the SDK, so the same code
can export to any OTLP backend, not just the local one.
"""

import os

from fastapi import FastAPI
from sqlalchemy.engine import Engine


def setup_telemetry(app: FastAPI, engine: Engine) -> bool:
    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return False

    from opentelemetry import metrics, trace
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
        OTLPMetricExporter,
    )
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
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

    # Health checks (Consul every 10s, compose healthchecks) would otherwise
    # drown out real traffic in every panel.
    FastAPIInstrumentor.instrument_app(app, excluded_urls="health")
    SQLAlchemyInstrumentor().instrument(engine=engine)
    return True
