"use client";

import { useLocale } from "@/components/LocaleProvider";
import { ER_ENTITIES, ER_TEXT } from "@/lib/docs/erDiagram";

// The tables as entity cards - plain HTML tables rather than a drawing, so
// the columns stay selectable text and follow the site's theme.
export function ErDiagram() {
  const { locale } = useLocale();
  const text = ER_TEXT[locale];
  return (
    <div className="nb-docs-diagram" data-testid="er-diagram" role="group" aria-label={text.label}>
      <div className="nb-docs-er">
        {ER_ENTITIES.map((entity) => (
          <div key={entity.name} className="nb-docs-er-entity" data-testid={`er-${entity.name}`}>
            <div className="nb-docs-er-head">
              <strong>{entity.name}</strong>
              <span>{entity.summary[locale]}</span>
            </div>
            <table>
            <thead>
              <tr>
                <th>{text.columns[0]}</th>
                <th>{text.columns[1]}</th>
                <th>{text.columns[2]}</th>
              </tr>
            </thead>
            <tbody>
              {entity.columns.map((column) => (
                <tr key={column.name}>
                  <td>
                    <code>{column.name}</code>
                    {column.keys?.map((key) => (
                      <span key={key} className="nb-docs-er-key">
                        {key}
                      </span>
                    ))}
                  </td>
                  <td>
                    <code>{column.type}</code>
                    {column.nullable && <span className="nb-docs-er-null">NULL</span>}
                  </td>
                  <td>{column.note[locale]}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="nb-docs-er-legend">{text.legend}</p>
      <p className="nb-docs-diagram-caption">{text.caption}</p>
    </div>
  );
}
