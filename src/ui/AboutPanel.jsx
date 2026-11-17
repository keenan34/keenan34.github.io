import { ExternalLink, FileText, Mail } from "lucide-react";
import { person, links, experience, education, skills } from "../data/portfolioData.js";

// Laid out on a centered axis: every row either spans the full width or splits into
// equal columns, so nothing leaves a ragged gap at any screen size.
const tile = "rounded-xl border border-white/10 bg-white/[0.03] p-4";

function Heading({ children }) {
  return (
    <h3 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
      <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
    </h3>
  );
}

export default function AboutPanel() {
  const actions = [
    [links.resume, "Résumé", FileText, true],
    [links.github, "GitHub", ExternalLink],
    [links.linkedin, "LinkedIn", ExternalLink],
    [`mailto:${links.email}`, "Email", Mail],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <img src={person.photo} alt={person.photoAlt} width="360" height="450"
          className="h-24 w-24 rounded-full border border-white/15 object-cover object-top" />
        <p className="mt-3 text-xl font-bold leading-tight tracking-[-0.015em] text-white sm:text-2xl">{person.name}</p>
        <p className="text-sm text-white/60">{person.role} · {person.city}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map(([href, label, Icon, primary]) => (
          <a key={label} href={href} target="_blank" rel="noopener"
            className={`inline-flex items-center justify-center gap-2 rounded-[3px] px-3 py-2.5 text-sm font-semibold transition-colors ${
              primary ? "bg-sign-ink text-sign hover:bg-white" : "border border-white/15 text-white/85 hover:border-white/40 hover:text-white"
            }`}>
            <Icon size={16} aria-hidden="true" /> {label}
          </a>
        ))}
      </div>

      <div className={`${tile} space-y-3 text-[0.95rem] leading-relaxed text-white/70`}>
        <p className="text-white/90">{person.pitch}</p>
        {person.about.map((t) => <p key={t}>{t}</p>)}
      </div>

      <section>
        <Heading>Experience</Heading>
        <div className="space-y-2">
          {experience.map((e) => (
            <div key={e.org} className={tile}>
              <p className="font-semibold text-white">{e.org}</p>
              <p className="text-sm text-white/50">{e.title} · {e.when}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/70 marker:text-white/35">
                {e.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
            </div>
          ))}
          <div className={tile}>
            <p className="font-semibold text-white">{education.org}</p>
            <p className="text-sm text-white/50">{education.title} · {education.when}</p>
            <p className="mt-2 text-sm text-white/70">{education.note}</p>
          </div>
        </div>
      </section>

      <section>
        <Heading>Tools</Heading>
        <dl className="grid grid-cols-2 gap-2">
          {skills.map((s) => (
            <div key={s.group} className={tile}>
              <dt className="text-sm font-semibold text-white">{s.group}</dt>
              <dd className="mt-1 text-[0.8rem] leading-snug text-white/55">{s.items}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-center text-sm text-white/60">{person.openTo}</p>
    </div>
  );
}
