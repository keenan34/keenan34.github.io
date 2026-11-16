import { ExternalLink, FileText, Mail } from "lucide-react";
import { person, links, experience, education, skills } from "../data/portfolioData.js";

export default function AboutPanel() {
  return (
    <div className="space-y-7">
      <div className="flex items-end gap-4">
        <img src={person.photo} alt={person.photoAlt} width="360" height="450"
          className="w-24 shrink-0 rounded-lg border border-white/10 object-cover" />
        <div>
          <p className="text-2xl font-bold leading-tight tracking-[-0.015em] text-white">{person.name}</p>
          <p className="text-white/60">{person.role} in {person.city}</p>
        </div>
      </div>

      <div className="space-y-3 text-white/70">
        <p className="text-white/90">{person.pitch}</p>
        {person.about.map((t) => <p key={t}>{t}</p>)}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={links.resume} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-[3px] bg-sign-ink px-4 py-2 text-sm font-semibold text-sign hover:bg-white">
          <FileText size={16} aria-hidden="true" /> Résumé (PDF)
        </a>
        {[
          [links.github, "GitHub", ExternalLink],
          [links.linkedin, "LinkedIn", ExternalLink],
          [`mailto:${links.email}`, "Email", Mail],
        ].map(([href, label, Icon]) => (
          <a key={label} href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-[3px] border border-white/15 px-4 py-2 text-sm text-white/85 hover:border-white/40 hover:text-white">
            <Icon size={16} aria-hidden="true" /> {label}
          </a>
        ))}
      </div>

      <section>
        <h3 className="text-base font-semibold text-white">Experience</h3>
        {experience.map((e) => (
          <div key={e.org} className="mt-3">
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-white">{e.org} <span className="font-normal text-white/50">{e.title}</span></span>
              <span className="text-sm text-white/50">{e.when}</span>
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/70 marker:text-white/35">
              {e.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
          </div>
        ))}
        <div className="mt-4">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-white">{education.org} <span className="font-normal text-white/50">{education.title}</span></span>
            <span className="text-sm text-white/50">{education.when}</span>
          </p>
          <p className="mt-1 text-sm text-white/70">{education.note}</p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-white">Tools</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.group}>
              <dt className="text-sm font-semibold text-white">{s.group}</dt>
              <dd className="text-sm text-white/50">{s.items}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-white/60">{person.openTo}</p>
    </div>
  );
}
