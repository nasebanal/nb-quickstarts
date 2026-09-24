"use client";

import { useEffect, useState } from "react";
import { VIA_FRONTEND_SERVER } from "@/lib/api";
import { useServed } from "@/lib/servedBy";
import { useLocale } from "./LocaleProvider";

interface ResolverStatus {
  mode: "direct" | "consul";
  directUrl: string;
  consul: { address: string; instances: string[] | null; error?: string };
}

// Which backend instance is answering, and - when the browser goes through the
// frontend server (NEXT_PUBLIC_API_BASE=/api/backend) - how that server finds
// the backend: one fixed address, or through Consul, switchable here. The
// switch is the frontend server's own runtime setting (PUT /api/resolver).
export function BackendRouting() {
  const { t } = useLocale();
  const served = useServed();
  const [status, setStatus] = useState<ResolverStatus | null>(null);

  useEffect(() => {
    if (!VIA_FRONTEND_SERVER) return;
    let cancelled = false;
    const load = () =>
      fetch("/api/resolver", { cache: "no-store" })
        .then((response) => response.json() as Promise<ResolverStatus>)
        .then((next) => !cancelled && setStatus(next))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const choose = async (mode: "direct" | "consul") => {
    const response = await fetch("/api/resolver", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (response.ok) setStatus((await response.json()) as ResolverStatus);
  };

  // Named the way the mode names its backends: through a fixed address it is
  // just "backend" (the address's host), through Consul it is one of backend-1/2/3.
  const answeredBy =
    served?.resolvedVia === "direct" && served.upstream ? served.upstream.split(":")[0] : (served?.servedBy ?? "-");

  return (
    <div className="nb-routing" data-testid="backend-routing">
      <span className="nb-routing-item">
        {t.routing.servedBy}:{" "}
        <strong data-testid="served-by">{answeredBy}</strong>
      </span>
      {VIA_FRONTEND_SERVER && (
        <>
          <span className="nb-routing-item" role="group" aria-label={t.routing.resolvedBy}>
            {t.routing.resolvedBy}:{" "}
            {(["direct", "consul"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={status?.mode === mode ? "nb-routing-toggle nb-routing-toggle-active" : "nb-routing-toggle"}
                aria-pressed={status?.mode === mode}
                onClick={() => choose(mode)}
                data-testid={`resolver-${mode}`}
              >
                {mode === "direct" ? t.routing.direct : t.routing.consul}
              </button>
            ))}
          </span>
          {status && (
            <span className="nb-routing-detail" data-testid="routing-detail">
              {status.mode === "direct"
                ? `${t.routing.fixedAddress}: ${status.directUrl.replace("http://", "")}`
                : status.consul.instances
                  ? `${t.routing.consulSays}: ${status.consul.instances.join(", ") || t.routing.noneHealthy}`
                  : `${t.routing.consulUnreachable} (${status.consul.error})`}
            </span>
          )}
        </>
      )}
    </div>
  );
}
