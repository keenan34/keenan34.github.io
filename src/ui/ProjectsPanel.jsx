import { ExternalLink } from "lucide-react";
import { projects } from "../data/portfolioData.js";

export default function ProjectsPanel() {
  return (
    <div className="space-y-6">
      {projects.map((p) => (
        <article key={p.name} className="rounded-xl border border-sky-400/20 bg-slate-950/40 p-4">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">{p.name}</h3>
          <p className="mt-1 text-sky-100/90">{p.pitch}</p>
          {p.links.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-4 text-sm">
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-flag-blue underline-offset-4 hover:underline">
                  {l.label} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ))}
            </p>
          )}
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300 marker:text-flag-red">
            {p.points.map((pt) => <li key={pt}>{pt}</li>)}
          </ul>
          {p.apps && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.apps.map((a) => (
                <div key={a.name} className={a.name === "Jobs" ? "sm:col-span-2" : ""}>
                  <dt className="font-semibold text-white">{a.name}</dt>
                  <dd className="mt-0.5 text-sm text-slate-400">{a.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-3 text-xs text-slate-400">{p.stack.join(" · ")}</p>
        </article>
      ))}
    </div>
  );
}
