"use client";

import { useState } from "react";
import Link from "next/link";
import type { CopyEntry, ReferenceImage } from "@/lib/types";
import { TEMPLATES, type TemplateId } from "@/lib/html-creative-brand";

const DEFAULT_TEMPLATE: TemplateId = "split-panel";

export function HtmlCreativesIndex({
  copyEntries,
  logos,
}: {
  copyEntries: CopyEntry[];
  logos: ReferenceImage[];
}) {
  const [logoId, setLogoId] = useState<string>(logos[0]?.id ?? "");
  // template escolhido por linha de copy (default = split-panel)
  const [templateByEntry, setTemplateByEntry] = useState<Record<string, TemplateId>>({});

  const logoParam = logoId ? `logo=${logoId}` : "";
  const linkFor = (entryId: string, format: "feed" | "story") => {
    const tpl = templateByEntry[entryId] ?? DEFAULT_TEMPLATE;
    const qs = [logoParam, `template=${tpl}`].filter(Boolean).join("&");
    return `/html-creatives/render/${entryId}/${format}?${qs}`;
  };

  return (
    <div className="space-y-4">
      {logos.length > 0 && (
        <label className="block max-w-xs">
          <span className="psa-label">Logo a usar nos criativos</span>
          <select className="psa-select" value={logoId} onChange={(e) => setLogoId(e.target.value)}>
            {logos.map((logo) => (
              <option key={logo.id} value={logo.id}>
                {logo.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* legenda dos modelos */}
      <div className="psa-card grid gap-2 p-4 text-xs text-psa-muted sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <div key={t.id}>
            <span className="font-semibold text-white">{t.label}</span>
            {!t.hasPhoto && <span className="text-psa-accent"> · sem foto</span>} — {t.desc}
          </div>
        ))}
      </div>

      {copyEntries.length === 0 ? (
        <p className="text-sm text-psa-muted">
          Nenhuma copy importada ainda — cole a tabela em{" "}
          <a href="/copy" className="text-psa-accent underline">
            Copy
          </a>
          .
        </p>
      ) : (
        <div className="psa-card overflow-hidden">
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-psa-surface text-psa-muted">
                <tr>
                  <th className="px-3 py-2">Persona</th>
                  <th className="px-3 py-2">Ângulo</th>
                  <th className="px-3 py-2">Headline</th>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {copyEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-psa-border align-top">
                    <td className="px-3 py-2">{entry.persona}</td>
                    <td className="px-3 py-2 text-psa-muted">{entry.angulo ?? "—"}</td>
                    <td className="px-3 py-2">{entry.headline}</td>
                    <td className="px-3 py-2">
                      <select
                        className="psa-select !py-1 !text-xs"
                        value={templateByEntry[entry.id] ?? DEFAULT_TEMPLATE}
                        onChange={(e) =>
                          setTemplateByEntry((prev) => ({
                            ...prev,
                            [entry.id]: e.target.value as TemplateId,
                          }))
                        }
                      >
                        {TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={linkFor(entry.id, "feed")}
                          target="_blank"
                          className="psa-btn-ghost px-2 py-1 text-xs"
                        >
                          Feed
                        </Link>
                        <Link
                          href={linkFor(entry.id, "story")}
                          target="_blank"
                          className="psa-btn-ghost px-2 py-1 text-xs"
                        >
                          Story
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
