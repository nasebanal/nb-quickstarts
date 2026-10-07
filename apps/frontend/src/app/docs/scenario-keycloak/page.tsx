"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { JwtRolesDiagram } from "@/components/docs/JwtRolesDiagram";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioKeycloak } from "@/lib/docs/scenarioKeycloak";

export default function DocsScenarioKeycloakPage() {
  const { locale } = useLocale();
  return (
    <DocsArticle
      content={scenarioKeycloak[locale]}
      // Rendered inside "How it works" (see slot: "keycloakRoles" in lib/docs/scenarioKeycloak.ts).
      slots={{ keycloakRoles: <JwtRolesDiagram only={["keycloak"]} /> }}
    />
  );
}
