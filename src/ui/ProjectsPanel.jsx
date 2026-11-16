import { ExternalLink } from "lucide-react";
import { projects } from "../data/portfolioData.js";

export default function ProjectsPanel() {
  return (
    <div className="space-y-6">
      {projects.map((p) => (
        <article key={p.name} className="rounded-[6px] border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-white">{p.name}</h3>
          <p className="mt-1 text-white/85">{p.pitch}</p>
          {p.links.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-4 text-sm">
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                  {l.label} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ))}
            </p>
          )}
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-white/70 marker:text-white/35">
            {p.points.map((pt) => <li key={pt}>{pt}</li>)}
          </ul>
          {p.apps && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.apps.map((a) => (
                <div key={a.name} className={a.name === "Jobs" ? "sm:col-span-2" : ""}>
                  <dt className="font-semibold text-white">{a.name}</dt>
                  <dd className="mt-0.5 text-sm text-white/50">{a.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-3 text-xs text-white/50">{p.stack.join(" · ")}</p>
        </article>
      ))}
    </div>
  );
}
