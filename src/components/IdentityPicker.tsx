import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { IdentityInfo } from "../types";
import classNames from "classnames";
import { Key } from "lucide-react";

interface IdentityPickerProps {
  onClose: () => void;
}

export function IdentityPicker({ onClose }: IdentityPickerProps) {
  const [identities, setIdentities] = useState<IdentityInfo[]>([]);
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<IdentityInfo[]>("list_identities").then(setIdentities);
    invoke<string | null>("get_saved_identity")
      .then(setCurrentIdentity)
      .catch(() => {});
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectIdentity = async (path: string) => {
    try {
      await invoke("set_identity", { path });
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fade-in fixed inset-0 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="w-105 rounded-lg border border-white/6 bg-vault-base">
        <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4">
          <div className="rounded-md border border-key-gold/20 bg-key-gold/6 p-2 text-key-gold">
            <Key />
          </div>
          <div>
            <h3 className="font-mono text-sm font-medium text-ink-primary">
              Identity
            </h3>
            <p className="text-xs text-ink-muted">
              Select a key for decryption
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-4 rounded-md border border-breach-red/20 bg-breach-red/6 px-4 py-2.5 text-xs text-breach-red">
            {error}
          </div>
        )}

        {/* Identity list */}
        <div className="p-3">
          {identities.map((id) => (
            <button
              key={id.path}
              onClick={() => selectIdentity(id.path)}
              className={classNames(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ",
                currentIdentity === id.path
                  ? " bg-white/4"
                  : " hover:bg-white/4",
              )}
            >
              <Key size={12} className="shrink-0 text-ink-muted" />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs text-ink-secondary">
                  {id.path}
                </span>
                <span className="font-mono text-[10px] tracking-wide text-ink-muted">
                  {id.key_type}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Custom path */}
        <div className="border-t border-white/6 px-5 py-4">
          <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
            Custom path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/path/to/identity"
              className="flex-1 rounded-md border border-white/6 bg-vault-abyss px-3 py-1.5 font-mono text-xs text-ink-primary placeholder-ink-muted transition-colors focus:border-steel-dim focus:outline-none"
            />
            <button
              onClick={() => selectIdentity(customPath)}
              disabled={!customPath}
              className="rounded-md border border-key-gold/30 bg-key-gold/8 px-3 py-1.5 font-mono text-xs font-medium text-key-gold transition-all hover:border-key-gold/50 hover:bg-key-gold/12 disabled:opacity-30"
            >
              Use
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/6 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-white/6 px-4 py-1.5 text-xs text-ink-tertiary transition-colors hover:border-white/10 hover:text-ink-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
