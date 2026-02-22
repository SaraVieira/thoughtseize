import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, Plus } from "lucide-react";

interface CreateSecretProps {
  availableGroups: string[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateSecret({
  availableGroups,
  onCreated,
  onCancel,
}: CreateSecretProps) {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = (group: string) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const handleCreate = async () => {
    if (!path || selectedGroups.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      await invoke("create_secret", {
        relativePath: path.endsWith(".age") ? path : `${path}.age`,
        content,
        groups: selectedGroups,
      });
      onCreated();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fade-in flex h-full flex-col p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-md border border-key-gold/20 bg-key-gold/6 p-2 text-key-gold">
          <Plus size={18} />
        </div>
        <h2 className="font-mono text-sm font-medium tracking-wide text-ink-primary">
          New Secret
        </h2>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-breach-red/20 bg-breach-red/6 px-4 py-3 text-xs text-breach-red">
          {error}
        </div>
      )}

      <label className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
        Path
      </label>
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="e.g. service/SECRET_NAME.age"
        className="mb-5 rounded-md border border-white/6 bg-vault-abyss px-3 py-2 font-mono text-xs text-ink-primary placeholder-ink-muted transition-colors focus:border-steel-dim focus:outline-none"
      />

      <label className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
        Content
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="mb-5 flex-1 resize-none rounded-md border border-white/6 bg-vault-abyss p-3 font-mono text-xs leading-relaxed text-ink-primary placeholder-ink-muted transition-colors focus:border-steel-dim focus:outline-none"
        placeholder="Secret value..."
      />

      <label className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
        Access Groups
      </label>
      <div className="mb-5 flex flex-wrap gap-2">
        {availableGroups.map((group) => (
          <button
            key={group}
            onClick={() => toggleGroup(group)}
            className={`rounded-md border px-3 py-1 font-mono text-[11px] tracking-wide transition-all ${
              selectedGroups.includes(group)
                ? "border-key-gold/30 bg-key-gold/8 text-key-gold"
                : "border-white/6 text-ink-tertiary hover:border-white/10 hover:text-ink-secondary"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={creating || !path || selectedGroups.length === 0}
          className="flex items-center gap-2 rounded-md border border-sealed-teal/30 bg-sealed-teal/8 px-4 py-1.5 font-mono text-xs font-medium tracking-wide text-sealed-teal transition-all hover:border-sealed-teal/50 hover:bg-sealed-teal/12 disabled:opacity-30"
        >
          <Lock size={13} />
          {creating ? "Encrypting..." : "Create & Encrypt"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-white/6 px-4 py-1.5 text-xs text-ink-tertiary transition-colors hover:border-white/10 hover:text-ink-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
