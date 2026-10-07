import type { Locale } from "@/lib/i18n";

// The roles around a JWT, as three small diagrams (JwtRolesDiagram.tsx): the general setup (an
// authentication server issues the token, the resource server verifies it with the server's public
// key), this app's default (the Backend process is both), and the Keycloak setup (shown on the Keycloak scenario's own page).
// Coordinates are in one 810 x 230 viewBox.
export interface JwtRolesNode {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** Lines under the title. */
  lines?: string[];
}

export interface JwtRolesArrow {
  from: [number, number];
  to: [number, number];
  label: string;
  /** Where the label is centered (or ends, for `labelEnd`). */
  at: [number, number];
  labelEnd?: boolean;
  dashed?: boolean;
}

export type JwtRolesKey = "general" | "app" | "keycloak";

export interface JwtRolesVariant {
  key: JwtRolesKey;
  caption: string;
  nodes: JwtRolesNode[];
  /** A dashed frame around several nodes ("one process"). */
  group?: { x: number; y: number; w: number; h: number; label: string };
  arrows: JwtRolesArrow[];
}

const CLIENT = { x: 20, y: 85, w: 170, h: 64 };
const AUTH = { x: 560, y: 12, w: 230, h: 74 };
const RESOURCE = { x: 560, y: 144, w: 230, h: 74 };

export function jwtRolesVariants(locale: Locale): {
  label: string;
  variants: JwtRolesVariant[];
} {
  const ja = locale === "ja";
  const T = (en: string, jaText: string) => (ja ? jaText : en);
  const client: JwtRolesNode = {
    ...CLIENT,
    title: T("Client", "クライアント"),
    lines: [
      T("browser, curl, another service", "ブラウザ、curl、他のサービス"),
    ],
  };
  const flow = (
    authTarget: [number, number],
    resTarget: [number, number],
    authBottom: [number, number],
    resTop: [number, number],
    loginLabel = T("1. Log in", "① ログイン"),
  ): JwtRolesArrow[] => [
    {
      from: [190, 100],
      to: authTarget,
      label: loginLabel,
      at: [375, 66],
    },
    {
      from: [authTarget[0], authTarget[1] + 16],
      to: [190, 114],
      label: T("2. Returns the JWT", "② JWTを返す"),
      at: [375, 98],
      dashed: true,
    },
    {
      from: [190, 134],
      to: resTarget,
      label: T("3. Calls the API with the JWT", "③ JWTを付けてAPIを呼ぶ"),
      at: [375, 165],
    },
    {
      from: resTop,
      to: authBottom,
      label: T("4. Fetches the public key (JWKS)", "④ 公開鍵(JWKS)を取得"),
      at: [resTop[0] - 12, 118],
      labelEnd: true,
      dashed: true,
    },
  ];
  const general: JwtRolesVariant = {
    key: "general",
    caption: T(
      "In general: the authentication server and the resource server are separate",
      "一般的な構成: 認証サーバーとリソースサーバーは別",
    ),
    nodes: [
      client,
      {
        ...AUTH,
        title: T("Authentication server", "認証サーバー"),
        lines: [
          T(
            "logs users in, creates (signs) the JWT",
            "ログイン、JWTの作成(署名)",
          ),
          T(
            "holds the private key, publishes the public key",
            "秘密鍵を持ち、公開鍵を公開",
          ),
        ],
      },
      {
        ...RESOURCE,
        title: T("Resource server", "リソースサーバー"),
        lines: [
          T("the Backend: serves the API", "Backend: APIを提供"),
          T("verifies the JWT with the public key", "公開鍵でJWTを検証"),
        ],
      },
    ],
    arrows: flow([560, 50], [560, 178], [675, 86], [675, 144]),
  };
  const thisApp: JwtRolesVariant = {
    key: "app",
    caption: T(
      "This app (default): the Backend process is both",
      "このアプリ(既定): Backendのプロセスが両方を兼ねる",
    ),
    nodes: [
      client,
      {
        x: 540,
        y: 34,
        w: 240,
        h: 76,
        title: T("Role: authentication server", "役割: 認証サーバー"),
        lines: ["POST /auth/login", "GET /.well-known/jwks.json"],
      },
      {
        x: 540,
        y: 134,
        w: 240,
        h: 76,
        title: T("Role: resource server", "役割: リソースサーバー"),
        lines: [
          T(
            "GET /accounts, POST /transactions, ...",
            "GET /accounts、POST /transactions など",
          ),
          T("verifies the JWT", "JWTを検証"),
        ],
      },
    ],
    group: {
      x: 520,
      y: 6,
      w: 280,
      h: 218,
      label: T("Backend (one process)", "Backend(1つのプロセス)"),
    },
    arrows: [
      {
        from: [190, 100],
        to: [540, 70],
        label: T("1. Log in", "① ログイン"),
        at: [365, 74],
      },
      {
        from: [540, 88],
        to: [190, 114],
        label: T("2. Returns the JWT", "② JWTを返す"),
        at: [365, 106],
        dashed: true,
      },
      {
        from: [190, 134],
        to: [540, 172],
        label: T("3. Calls the API with the JWT", "③ JWTを付けてAPIを呼ぶ"),
        at: [365, 168],
      },
      {
        from: [660, 134],
        to: [660, 110],
        label: T("4. Same key, same process", "④ 同じプロセス内の鍵"),
        at: [650, 126],
        labelEnd: true,
        dashed: true,
      },
    ],
  };
  const keycloak: JwtRolesVariant = {
    key: "keycloak",
    caption: T(
      "In this scenario: Keycloak creates the JWT, the Backend verifies it",
      "このシナリオの構成: JWTはKeycloakが作成し、Backendが検証",
    ),
    nodes: [
      {
        ...CLIENT,
        title: "Frontend",
        lines: [T("browser", "ブラウザ")],
      },
      {
        ...AUTH,
        title: "Keycloak",
        lines: [
          T(
            "the authentication server (a separate server)",
            "認証サーバー(別のサーバー)",
          ),
          T("creates (signs) the JWT", "JWTを作成(署名)"),
        ],
      },
      {
        ...RESOURCE,
        title: T("Resource server", "リソースサーバー"),
        lines: [
          T("the Backend: serves the API", "Backend: APIを提供"),
          T(
            "verifies the JWT with Keycloak's key",
            "KeycloakのJWKSでJWTを検証",
          ),
        ],
      },
    ],
    arrows: flow(
      [560, 50],
      [560, 178],
      [675, 86],
      [675, 144],
      T("1. Signs in on Keycloak", "① Keycloakでサインイン"),
    ),
  };
  return {
    label: T(
      "Diagrams of the roles around a JWT: the general setup, this app, and the Keycloak setup",
      "JWTにまつわる役割の図: 一般的な構成、このアプリ、Keycloak利用時",
    ),
    variants: [general, thisApp, keycloak],
  };
}
