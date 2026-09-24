"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { ARCHITECTURE_LABELS } from "@/lib/docs/architectureDiagram";
import { LightboxOverlay, useLightbox } from "./Lightbox";

// Hand-placed layouts (coordinates below), not an auto-layout engine's. Two
// diagrams share the building blocks here, and deliberately share their
// columns too, so they can be read one above the other:
//  - "stack": Browser -> Frontend -> Backend -> MySQL down the middle, with
//    async above, gateway & mocks below, identity & secrets upper right and
//    monitoring lower right. Its protocol is REST.
//  - "mcp": MCP client -> Backend -> MySQL on the same columns (the Frontend
//    column is simply empty - MCP doesn't go through it), with agentgateway
//    attached like Kong and Keycloak / Vault in the same upper-right group.
//    Its protocol is MCP, drawn in the accent color.
//  - "consul": service discovery. Browser -> Frontend (server) -> Backend
//    instances -> MySQL on the same columns, with Consul above: it health-
//    checks the backends and MySQL, and the Frontend asks it which are healthy.
// Edges are routed at right angles, each with its own column so none of them
// cross a node or one another. Arrows point from the caller to what it calls.
type Variant = "stack" | "mcp" | "consul";
const DIMENSIONS: Record<Variant, { width: number; height: number }> = {
  stack: { width: 880, height: 610 },
  mcp: { width: 880, height: 560 },
  consul: { width: 880, height: 400 },
};

// Lightbox chrome: .nb-docs-lightbox's own
// padding plus .nb-docs-lightbox-diagram's own padding cost 24px each on
// every side.
const LIGHTBOX_CHROME_PX = (24 + 24) * 2;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODE_H = 40;

function Group({ box, title, titleAtBottomRight }: { box: Box; title: string; titleAtBottomRight?: boolean }) {
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} className="nb-arch-group" />
      <text
        x={titleAtBottomRight ? box.x + box.w - 10 : box.x + box.w / 2}
        y={titleAtBottomRight ? box.y + box.h - 10 : box.y + 20}
        textAnchor={titleAtBottomRight ? "end" : "middle"}
        className="nb-arch-group-title"
      >
        {title}
      </text>
    </g>
  );
}

function Node({ box, label }: { box: Box; label: string }) {
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={4} className="nb-arch-node" />
      <text x={box.x + box.w / 2} y={box.y + box.h / 2} textAnchor="middle" dominantBaseline="central" className="nb-arch-text">
        {label}
      </text>
    </g>
  );
}

// Arrowhead at the end of the path by default; `reverse` puts it at the start
// instead (for a route drawn from the callee's side), `both` at both ends.
function Edge({
  d,
  dashed,
  main,
  reverse,
  both,
  mcp,
  marker,
}: {
  d: string;
  dashed?: boolean;
  main?: boolean;
  reverse?: boolean;
  both?: boolean;
  /** An MCP-protocol edge: drawn in the accent color, with its own arrowhead. */
  mcp?: boolean;
  marker: string;
}) {
  const head = `url(#${mcp ? `${marker}-mcp` : marker})`;
  const classes = ["nb-arch-edge", main || mcp ? "nb-arch-edge-main" : "", mcp ? "nb-arch-edge-mcp" : ""];
  return (
    <path
      d={d}
      fill="none"
      className={classes.filter(Boolean).join(" ")}
      strokeDasharray={dashed ? "4 3" : undefined}
      markerEnd={reverse ? undefined : head}
      markerStart={reverse || both ? head : undefined}
    />
  );
}

// `onGroup` picks which background the label's halo matches, so the text
// stays readable over an edge without leaving a visible box around it.
function EdgeLabel({
  x,
  y,
  text,
  anchor = "middle",
  onGroup,
}: {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  onGroup?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      className={onGroup ? "nb-arch-label nb-arch-label-on-group" : "nb-arch-label"}
    >
      {text}
    </text>
  );
}

// Right-angle routes, one corner (rounded) each. `leftThen` runs horizontally
// from (sx, sy) to column px, then vertically to ty: `down`/`up` say which
// way it turns, and `px` is the column that edge owns.
const R = 6;
function leftThenDown(sx: number, sy: number, px: number, ty: number): string {
  return `M${sx},${sy} H${px + R} Q${px},${sy} ${px},${sy + R} V${ty}`;
}
function leftThenUp(sx: number, sy: number, px: number, ty: number): string {
  return `M${sx},${sy} H${px + R} Q${px},${sy} ${px},${sy - R} V${ty}`;
}
function rightThenUp(sx: number, sy: number, px: number, ty: number): string {
  return `M${sx},${sy} H${px - R} Q${px},${sy} ${px},${sy - R} V${ty}`;
}

function Cylinder({ x, top, w, h, label }: { x: number; top: number; w: number; h: number; label: string }) {
  const ry = 8;
  return (
    <g>
      <path d={`M${x},${top + ry} a${w / 2},${ry} 0 0 1 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0 1 ${-w},0 z`} className="nb-arch-node" />
      <path d={`M${x},${top + ry} a${w / 2},${ry} 0 0 0 ${w},0`} fill="none" className="nb-arch-edge" />
      <text x={x + w / 2} y={top + h / 2 + 4} textAnchor="middle" dominantBaseline="central" className="nb-arch-text">
        {label}
      </text>
    </g>
  );
}

function ArrowDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="nb-arch-arrow" />
      </marker>
      <marker id={`${id}-mcp`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="nb-arch-arrow-mcp" />
      </marker>
    </defs>
  );
}

// Bottom-left key: which line style is which protocol, so the two diagrams
// can be told apart at a glance.
function Legend({ x, y, rows }: { x: number; y: number; rows: { label: string; kind: "rest" | "mcp" | "optional" }[] }) {
  return (
    <g>
      {rows.map((row, i) => (
        <g key={row.kind}>
          <line
            x1={x}
            x2={x + 26}
            y1={y + i * 20}
            y2={y + i * 20}
            className={["nb-arch-edge", row.kind === "optional" ? "" : "nb-arch-edge-main", row.kind === "mcp" ? "nb-arch-edge-mcp" : ""].join(" ")}
            strokeDasharray={row.kind === "optional" ? "4 3" : undefined}
          />
          <text x={x + 34} y={y + i * 20} dominantBaseline="central" className="nb-arch-label" style={{ stroke: "none" }}>
            {row.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function StackDiagram({ labels, style }: { labels: Record<string, string>; style?: React.CSSProperties }) {
  const { width: WIDTH, height: HEIGHT } = DIMENSIONS.stack;
  const marker = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Groups
  const net: Box = { x: 175, y: 235, w: 615, h: 170 };
  const asyncG: Box = { x: 200, y: 30, w: 275, h: 100 };
  const gw: Box = { x: 170, y: 430, w: 320, h: 170 };
  const identity: Box = { x: 620, y: 40, w: 170, h: 130 };
  const agent: Box = { x: 620, y: 430, w: 170, h: 84 };

  // The spine
  const browser: Box = { x: 20, y: 300, w: 110, h: NODE_H };
  const fe: Box = { x: 200, y: 300, w: 110, h: NODE_H };
  const be: Box = { x: 390, y: 274, w: 170, h: 92 };

  // Satellites
  const locust: Box = { x: 20, y: 68, w: 110, h: NODE_H };
  const kafka: Box = { x: 210, y: 68, w: 90, h: NODE_H };
  const bridge: Box = { x: 365, y: 68, w: 100, h: NODE_H };
  const kong: Box = { x: 230, y: 470, w: 100, h: NODE_H };
  const specmatic: Box = { x: 185, y: 550, w: 105, h: NODE_H };
  const microcks: Box = { x: 370, y: 550, w: 105, h: NODE_H };
  const keycloak: Box = { x: 650, y: 72, w: 110, h: 36 };
  const vault: Box = { x: 650, y: 120, w: 110, h: 36 };
  const obs: Box = { x: 650, y: 462, w: 110, h: 36 };

  const cy = (b: Box) => b.y + b.h / 2;
  const cx = (b: Box) => b.x + b.w / 2;
  const bottom = (b: Box) => b.y + b.h;

  // MySQL cylinder, centred under Consul so their edge is a straight drop.
  const dbW = 110;
  const dbX = 650;
  const dbTop = 292;
  const dbH = 56;

  // Backend's top edge takes kafka-bridge (left) and the identity trio (right, Keycloak leftmost so
  // the three routes nest instead of crossing); its bottom edge takes Kong (left) and the agent pair
  // (Observability leftmost, same reason).
  const topPorts = { bridge: cx(bridge), keycloak: 505, vault: 525 };
  const bottomPorts = { kong: 430, obs: 505 };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ArrowDefs id={marker} />

      <Group box={net} title={labels.appsNetwork} titleAtBottomRight />
      <Group box={asyncG} title={labels.asyncGroup} />
      <Group box={gw} title={labels.gatewayGroup} />
      <Group box={identity} title={labels.identityGroup} />
      <Group box={agent} title={labels.agentGroup} />

      {/* Edges are drawn before nodes, so an arrowhead is never hidden under a box's own border. */}

      {/* The spine: Browser -> Frontend -> Backend -> MySQL */}
      <Edge marker={marker} main d={`M${browser.x + browser.w},${cy(browser)} H${fe.x}`} />
      <EdgeLabel x={153} y={cy(browser) - 10} text="HTTP" />
      <Edge marker={marker} main d={`M${fe.x + fe.w},${cy(fe)} H${be.x}`} />
      <EdgeLabel x={350} y={cy(fe) - 10} text="REST" onGroup />
      <Edge marker={marker} main d={`M${be.x + be.w},${cy(be)} H${dbX}`} />

      {/* Frontend: can be switched to go through Kong (scenario 1). Kafka is deliberately not linked from here - it's an ingestion path for external producers, not something a browser app writes to. */}
      <Edge marker={marker} dashed d={`M${cx(fe)},${bottom(fe)} V${kong.y}`} />
      <EdgeLabel x={cx(fe) + 8} y={418} text={labels.via} anchor="start" />

      {/* Async: Locust -> Kafka -> kafka-bridge -> Backend (the load-test comparison in scenario 2). Kafka carries events; kafka-bridge turns each one into POST /accounts, so its last hop is REST. */}
      <Edge marker={marker} dashed d={`M${locust.x + locust.w},${cy(locust)} H${kafka.x}`} />
      <EdgeLabel x={(locust.x + locust.w + asyncG.x) / 2} y={cy(locust) - 10} text={labels.load} />
      <Edge marker={marker} d={`M${kafka.x + kafka.w},${cy(kafka)} H${bridge.x}`} />
      <EdgeLabel x={(kafka.x + kafka.w + bridge.x) / 2} y={cy(kafka) - 10} text={labels.events} onGroup />
      <Edge marker={marker} d={`M${topPorts.bridge},${bottom(bridge)} V${be.y}`} />
      <EdgeLabel x={topPorts.bridge + 8} y={185} text="REST" anchor="start" />

      {/* Gateway & mocks: Kong -> Backend, and Kong's swap targets */}
      <Edge marker={marker} d={rightThenUp(kong.x + kong.w, cy(kong), bottomPorts.kong, bottom(be))} />
      <EdgeLabel x={380} y={cy(kong) - 9} text="/api/*" onGroup />
      <Edge marker={marker} dashed d={`M${kong.x + 25},${bottom(kong)} C${kong.x + 25},${specmatic.y - 15} ${cx(specmatic)},${specmatic.y - 25} ${cx(specmatic)},${specmatic.y}`} />
      <Edge marker={marker} dashed d={`M${kong.x + 75},${bottom(kong)} C${kong.x + 75},${microcks.y - 15} ${cx(microcks)},${microcks.y - 25} ${cx(microcks)},${microcks.y}`} />
      <EdgeLabel x={cx(specmatic) - 8} y={536} text={labels.swapTarget} anchor="end" onGroup />
      <EdgeLabel x={cx(microcks) + 8} y={536} text={labels.swapTarget} anchor="start" onGroup />

      {/* Identity & secrets. Backend calls Keycloak (fetches the public keys that verify a JWT) and Vault (fetches its DB credential); Vault also calls MySQL (creates that DB user); The arrow is the call, the label is what comes back. Ports on Backend's top run left to right in the order the nodes run top to bottom, so the routes nest instead of crossing. */}
      <Edge marker={marker} dashed reverse d={leftThenDown(keycloak.x, cy(keycloak), topPorts.keycloak, be.y)} />
      <EdgeLabel x={585} y={cy(keycloak)} text={labels.jwks} />
      <Edge marker={marker} dashed reverse d={leftThenDown(vault.x, cy(vault), topPorts.vault, be.y)} />
      <EdgeLabel x={598} y={cy(vault)} text={labels.credential} />
      <Edge marker={marker} dashed d={`M${cx(vault)},${bottom(vault)} V${dbTop}`} />
      <EdgeLabel x={cx(vault) - 8} y={262} text={labels.dbUsers} anchor="end" onGroup />

      {/* Backend -> Observability (pushes OTLP) */}
      <Edge marker={marker} dashed reverse d={leftThenUp(obs.x, cy(obs), bottomPorts.obs, bottom(be))} />
      <EdgeLabel x={580} y={cy(obs)} text={labels.otlp} />

      <Node box={browser} label={labels.browser} />
      <Node box={fe} label={labels.frontend} />
      <Node box={be} label={labels.backend} />
      <Cylinder x={dbX} top={dbTop} w={dbW} h={dbH} label={labels.mysql} />
      <Node box={kong} label={labels.kong} />
      <Node box={specmatic} label={labels.specmatic} />
      <Node box={microcks} label={labels.microcks} />
      <Node box={locust} label={labels.locust} />
      <Node box={kafka} label={labels.kafka} />
      <Node box={bridge} label={labels.kafkaBridge} />
      <Node box={keycloak} label={labels.keycloak} />
      <Node box={vault} label={labels.vault} />
      <Node box={obs} label={labels.observability} />

      <Legend
        x={20}
        y={566}
        rows={[
          { label: labels.legendRest, kind: "rest" },
          { label: labels.legendOptional, kind: "optional" },
        ]}
      />
    </svg>
  );
}

function McpDiagram({ labels, style }: { labels: Record<string, string>; style?: React.CSSProperties }) {
  const { width, height } = DIMENSIONS.mcp;
  const marker = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Groups - same columns as the stack diagram (net, identity/secrets, gateway)
  const net: Box = { x: 175, y: 235, w: 615, h: 170 };
  const identity: Box = { x: 620, y: 40, w: 170, h: 130 };
  const gwG: Box = { x: 170, y: 430, w: 320, h: 110 };

  // The spine, on the stack diagram's columns: the Frontend's column is empty.
  const client: Box = { x: 20, y: 300, w: 110, h: NODE_H };
  const be: Box = { x: 390, y: 274, w: 170, h: 92 };
  const dbX = 650;
  const dbW = 110;
  const dbTop = 292;
  const dbH = 56;

  // Satellites, where Kong / Keycloak / Vault sit in the stack diagram
  const ag: Box = { x: 220, y: 470, w: 120, h: NODE_H };
  const keycloak: Box = { x: 650, y: 72, w: 110, h: 36 };
  const vault: Box = { x: 650, y: 120, w: 110, h: 36 };

  const cy = (b: Box) => b.y + b.h / 2;
  const cx = (b: Box) => b.x + b.w / 2;
  const bottom = (b: Box) => b.y + b.h;

  // Same Backend ports as the stack diagram for the same integrations.
  const topPorts = { keycloak: 505, vault: 525 };
  const kongPort = 430;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={style} xmlns="http://www.w3.org/2000/svg">
      <ArrowDefs id={marker} />

      <Group box={net} title={labels.appsNetwork} titleAtBottomRight />
      <Group box={identity} title={labels.identityGroup} />
      <Group box={gwG} title={labels.agentGatewayGroup} />

      {/* The spine: MCP client -> Backend (its built-in /mcp, from fastapi-mcp) -> MySQL */}
      <Edge marker={marker} mcp d={`M${client.x + client.w},${cy(client)} H${be.x}`} />
      <EdgeLabel x={262} y={cy(client) - 12} text={labels.mcpNative} />
      <text x={262} y={cy(client) + 18} textAnchor="middle" className="nb-arch-label" style={{ stroke: "none" }}>
        {labels.noFrontend}
      </text>
      <Edge marker={marker} main d={`M${be.x + be.w},${cy(be)} H${dbX}`} />

      {/* agentgateway, like Kong in the stack diagram: an optional way in that sits in front of the Backend. It speaks MCP to the client, and calls the Backend's REST API with tools built from the OpenAPI contract. */}
      <Edge marker={marker} mcp dashed d={`M${client.x + 55},${bottom(client)} V${cy(ag) - 6} Q${client.x + 55},${cy(ag)} ${client.x + 61},${cy(ag)} H${ag.x}`} />
      <EdgeLabel x={150} y={cy(ag)} text={labels.mcpProtocol} />
      <Edge marker={marker} dashed d={rightThenUp(ag.x + ag.w, cy(ag), kongPort, bottom(be))} />
      <EdgeLabel x={380} y={cy(ag) - 9} text="REST" onGroup />
      <text x={cx(ag)} y={bottom(ag) + 18} textAnchor="middle" className="nb-arch-label" style={{ stroke: "none" }}>
        {labels.openapiToTools}
      </text>

      {/* Keycloak: the client logs in and gets a JWT (over OIDC, not MCP); Backend fetches the public keys that verify it. agentgateway can verify the JWT at the gateway too - supported, not drawn (see the caption). */}
      <Edge
        marker={marker}
        dashed
        both
        d={`M${client.x + 55},${client.y} V22 Q${client.x + 55},16 ${client.x + 61},16 H794 Q800,16 800,22 V${cy(keycloak) - 6} Q800,${cy(keycloak)} 794,${cy(keycloak)} H${keycloak.x + keycloak.w}`}
      />
      <EdgeLabel x={390} y={16} text={labels.loginToken} />
      <Edge marker={marker} dashed reverse d={leftThenDown(keycloak.x, cy(keycloak), topPorts.keycloak, be.y)} />
      <EdgeLabel x={585} y={cy(keycloak)} text={labels.jwks} />

      {/* Vault: Backend fetches its DB credential; Vault creates that MySQL user. */}
      <Edge marker={marker} dashed reverse d={leftThenDown(vault.x, cy(vault), topPorts.vault, be.y)} />
      <EdgeLabel x={590} y={cy(vault)} text={labels.credential} />
      <Edge marker={marker} dashed d={`M${cx(vault)},${bottom(vault)} V${dbTop}`} />
      <EdgeLabel x={cx(vault) + 8} y={226} text={labels.dbUsers} anchor="start" />

      <Node box={client} label={labels.mcpClient} />
      <Node box={be} label={labels.backend} />
      <Cylinder x={dbX} top={dbTop} w={dbW} h={dbH} label={labels.mysql} />
      <Node box={ag} label={labels.agentgateway} />
      <Node box={keycloak} label={labels.keycloak} />
      <Node box={vault} label={labels.vault} />

      <Legend
        x={640}
        y={476}
        rows={[
          { label: labels.legendMcp, kind: "mcp" },
          { label: labels.legendRest, kind: "rest" },
          { label: labels.legendOptional, kind: "optional" },
        ]}
      />
    </svg>
  );
}

function ConsulDiagram({ labels, style }: { labels: Record<string, string>; style?: React.CSSProperties }) {
  const { width, height } = DIMENSIONS.consul;
  const marker = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const browser: Box = { x: 20, y: 200, w: 110, h: NODE_H };
  const fe: Box = { x: 200, y: 200, w: 110, h: NODE_H };
  const consul: Box = { x: 320, y: 30, w: 110, h: NODE_H };
  // Backend instances, apps' own (backend-1, the fixed address's target) in the middle.
  const group: Box = { x: 470, y: 80, w: 170, h: 270 };
  const b2: Box = { x: 500, y: 110, w: 110, h: NODE_H };
  const b1: Box = { x: 500, y: 200, w: 110, h: NODE_H };
  const b3: Box = { x: 500, y: 290, w: 110, h: NODE_H };
  const dbX = 720;
  const dbW = 110;
  const dbTop = 200;
  const dbH = 56;

  const cy = (b: Box) => b.y + b.h / 2;
  const cx = (b: Box) => b.x + b.w / 2;
  const R = 6;

  // FE -> an instance off the FE-to-b1 line: out to the bus column, then up/down to the instance's left side.
  const fan = (target: Box, up: boolean) =>
    `M${fe.x + fe.w},${cy(fe)} H384 Q390,${cy(fe)} 390,${cy(fe) + (up ? -R : R)} V${cy(target) + (up ? R : -R)} Q390,${cy(target)} 396,${cy(target)} H${target.x}`;
  // an instance -> MySQL: out to the bus column, then to MySQL's left side.
  const toDb = (from: Box) => {
    const up = cy(from) < 228;
    return from === b1
      ? `M${from.x + from.w},${cy(from)} H${dbX}`
      : `M${from.x + from.w},${cy(from)} H659 Q665,${cy(from)} 665,${cy(from) + (up ? R : -R)} V${228 + (up ? -R : R)} Q665,228 671,228 H${dbX}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={style} xmlns="http://www.w3.org/2000/svg">
      <ArrowDefs id={marker} />

      <Group box={group} title={labels.backendGroup} />

      {/* Browser -> Frontend (server) -> the instances -> MySQL */}
      <Edge marker={marker} main d={`M${browser.x + browser.w},${cy(browser)} H${fe.x}`} />
      <EdgeLabel x={153} y={cy(browser) - 10} text="HTTP" />
      <Edge marker={marker} main d={`M${fe.x + fe.w},${cy(fe)} H${b1.x}`} />
      <Edge marker={marker} main d={fan(b2, true)} />
      <Edge marker={marker} main d={fan(b3, false)} />
      <EdgeLabel x={352} y={cy(fe) - 10} text="REST" />
      <Edge marker={marker} main d={toDb(b2)} />
      <Edge marker={marker} main d={toDb(b1)} />
      <Edge marker={marker} main d={toDb(b3)} />
      <text x={cx(b1)} y={b1.y + b1.h + 16} textAnchor="middle" className="nb-arch-label" style={{ stroke: "none" }}>
        {labels.fixedTarget}
      </text>

      {/* Consul: the Frontend asks it which backends are healthy (and gets the list back); it health-checks the backends and MySQL. */}
      <Edge marker={marker} dashed both d={`M${cx(fe)},${fe.y} V${cy(consul) + R} Q${cx(fe)},${cy(consul)} ${cx(fe) + R},${cy(consul)} H${consul.x}`} />
      <EdgeLabel x={cx(fe) - 6} y={cy(consul) - 16} text={labels.consulAsk} anchor="middle" />
      <Edge marker={marker} dashed d={`M${consul.x + consul.w},${cy(consul) - 6} H${cx_(dbX, dbW) - R} Q${cx_(dbX, dbW)},${cy(consul) - 6} ${cx_(dbX, dbW)},${cy(consul) - 6 + R} V${dbTop}`} />
      <Edge marker={marker} dashed d={`M${consul.x + consul.w},${cy(consul) + 6} H${cx(group) - R} Q${cx(group)},${cy(consul) + 6} ${cx(group)},${cy(consul) + 6 + R} V${group.y}`} />
      <EdgeLabel x={(consul.x + consul.w + cx(group)) / 2 - 4} y={cy(consul) + 22} text={labels.healthEvery2s} />
      <EdgeLabel x={(cx(group) + cx_(dbX, dbW)) / 2 + 20} y={cy(consul) - 16} text={labels.healthChecks} />

      <Node box={browser} label={labels.browser} />
      <Node box={fe} label={labels.frontendServer} />
      <Node box={consul} label={labels.consul} />
      <Node box={b2} label="backend-2" />
      <Node box={b1} label="backend-1" />
      <Node box={b3} label="backend-3" />
      <Cylinder x={dbX} top={dbTop} w={dbW} h={dbH} label={labels.mysql} />

      <Legend
        x={20}
        y={340}
        rows={[
          { label: labels.legendRest, kind: "rest" },
          { label: labels.legendConsul, kind: "optional" },
        ]}
      />
    </svg>
  );
}

// x of the centre of something `w` wide starting at `x` (a Box-free helper for the cylinder).
function cx_(x: number, w: number): number {
  return x + w / 2;
}

export function ArchitectureDiagram({ label, variant = "stack" }: { label: string; variant?: Variant }) {
  const { locale } = useLocale();
  const labels = ARCHITECTURE_LABELS[locale];
  const { width, height } = DIMENSIONS[variant];
  const { open, setOpen, close } = useLightbox();
  const [scale, setScale] = useState(1);
  const Diagram = variant === "mcp" ? McpDiagram : variant === "consul" ? ConsulDiagram : StackDiagram;

  // The lightbox's flex layout gives a percentage width nothing to resolve
  // against, so the enlarged SVG gets concrete pixel dimensions scaled to
  // the current viewport instead (and follows resizes while open).
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const w = window.innerWidth - LIGHTBOX_CHROME_PX;
      const h = window.innerHeight - LIGHTBOX_CHROME_PX;
      setScale(Math.min(w / width, h / height));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, width, height]);

  return (
    <div className="nb-docs-diagram" data-testid={variant === "stack" ? "architecture-diagram" : `architecture-diagram-${variant}`}>
      <div className="nb-docs-diagram-zoomable" role="img" aria-label={label} onClick={() => setOpen(true)}>
        <Diagram labels={labels} />
      </div>
      <p className="nb-docs-diagram-caption">{variant === "mcp" ? labels.captionMcp : variant === "consul" ? labels.captionConsul : labels.captionStack}</p>
      {open && (
        <LightboxOverlay label={label} onClose={close}>
          <div className="nb-docs-lightbox-diagram">
            <Diagram labels={labels} style={{ width: width * scale, height: height * scale }} />
          </div>
        </LightboxOverlay>
      )}
    </div>
  );
}
