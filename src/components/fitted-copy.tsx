import { useRef } from "react";
import { useDisplayBlocks } from "@/lib/use-display-blocks";
import { cn } from "@/lib/utils";

/**
 * Prose on a reader surface, split so a multi-sentence block stays
 * within a third of the viewport. One sentence may still be taller.
 */
export function FittedCopy({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const display = useDisplayBlocks(ref, [text], text);
  const blocks = display.blocksFor(text);
  return (
    <div
      ref={ref}
      className={cn("fitted-copy", className)}
      data-display-blocks={display.ready ? "ready" : "pending"}
    >
      {blocks.map((block, index) => (
        <p key={index} className="breath-block" data-block-sentences={block.sentences}>
          {block.text}
        </p>
      ))}
    </div>
  );
}
