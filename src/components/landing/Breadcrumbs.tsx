import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { breadcrumbsFor } from "@/lib/search-index";

export function Breadcrumbs({ to }: { to: string }) {
  const crumbs = breadcrumbsFor(to);
  if (crumbs.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          {c.to && i < crumbs.length - 1 ? (
            <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
          ) : (
            <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>{c.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
