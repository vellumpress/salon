import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { PagesShell } from "@/components/pages-shell";
import { canonicalWorkId } from "@/lib/work-id-alias";

/**
 * Old /book links. The first paint matches the Pages shell, then the address
 * moves to the reader. A retired slug follows the local book.
 */
export const Route = createFileRoute("/book/$workId")({
  component: BookRedirect,
});

function BookRedirect() {
  const { workId } = Route.useParams();
  useLayoutEffect(() => {
    const id = canonicalWorkId(workId);
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/book\/[^/]+\/?$/, `/read/${id}`);
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [workId]);
  return <PagesShell />;
}
