import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect } from "react";
import { WorksCard } from "@/components/works-card";
import { ResumeLink } from "@/components/resume-link";
import {
  curatedCardCopy,
  curatorHeading,
  curatorSections,
} from "@/lib/catalog/curated";
import { shelfWork } from "@/lib/catalog/shelf";
import { prefetchWork } from "@/lib/prefetch-work";

export const Route = createFileRoute("/curated")({
  component: CuratedHub,
});

function CuratedHub() {
  const sections = curatorSections();

  useEffect(() => {
    for (const section of curatorSections()) {
      for (const id of section.workIds.slice(0, 4)) prefetchWork(id);
    }
  }, []);

  return (
    <main className="board board-alive board-adapted">
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          Curated
        </span>
        <ResumeLink />
      </div>

      {sections.map((section) => {
        const heading = curatorHeading(section.curator);
        const headingId = `curator-${section.curator.slug}`;
        return (
          <Fragment key={section.curator.slug}>
            <h2
              id={headingId}
              className="cell-label curator-heading type-lede"
              data-curator={section.curator.slug}
            >
              {heading}
            </h2>
            <nav className="cell-works" aria-labelledby={headingId}>
              <div className="works-scroller is-snap">
                {section.workIds.map((id) => {
                  const work = shelfWork(id);
                  if (!work) return null;
                  const copy = curatedCardCopy(section.curator, id);
                  return (
                    <WorksCard
                      key={id}
                      work={work}
                      title={copy?.title}
                      author={copy?.author}
                    />
                  );
                })}
              </div>
            </nav>
          </Fragment>
        );
      })}
    </main>
  );
}
