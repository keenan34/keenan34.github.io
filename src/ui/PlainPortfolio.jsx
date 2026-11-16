import ProjectsPanel from "./ProjectsPanel.jsx";
import AboutPanel from "./AboutPanel.jsx";

// For browsers without WebGL: the same content as the diorama, as a plain page.
export default function PlainPortfolio() {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-12 px-5 py-10">
        <AboutPanel />
        <section>
          <h2 className="mb-4 text-2xl font-bold tracking-[-0.015em] text-white">Projects</h2>
          <ProjectsPanel />
        </section>
      </div>
    </main>
  );
}
