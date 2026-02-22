import { Folder, Search } from "lucide-react";

interface TopBarProps {
  projectPath: string | null;
  onOpenProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TopBar({
  projectPath,
  onOpenProject,
  searchQuery,
  onSearchChange,
}: TopBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-white/6 bg-vault-deep px-4 py-2.5">
      <button
        onClick={onOpenProject}
        className="flex items-center gap-2 rounded-md border border-white/8 bg-vault-raised px-3 py-1.5 font-mono text-xs font-medium tracking-wide text-ink-secondary transition-colors hover:border-key-dim/40 hover:text-key-gold"
      >
        <Folder size={12} />
        Open Vault
      </button>
      {projectPath && (
        <span
          className="truncate font-mono text-xs text-ink-tertiary"
          title={projectPath}
        >
          {projectPath}
        </span>
      )}
      <div className="ml-auto">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            size={13}
          />

          <input
            type="text"
            placeholder="Filter secrets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-52 rounded-md border border-white/6 bg-vault-base py-1.5 pl-8 pr-3 font-mono text-xs text-ink-primary placeholder-ink-muted transition-colors focus:border-steel-dim focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
