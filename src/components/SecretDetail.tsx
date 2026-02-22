import { LockOpenIcon, Lock, UnlockKeyhole } from "lucide-react";
import { useState, useEffect } from "react";

interface SecretDetailProps {
  path: string;
  groups: string[];
  content: string | null;
  decrypting: boolean;
  saving: boolean;
  error: string | null;
  onDecrypt: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}

export function SecretDetail({
  path,
  groups,
  content,
  decrypting,
  saving,
  error,
  onDecrypt,
  onSave,
  onDelete,
}: SecretDetailProps) {
  const [editedContent, setEditedContent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (content !== null) {
      setEditedContent(content);
    }
  }, [content]);

  useEffect(() => {
    setConfirmDelete(false);
  }, [path]);

  const hasChanges = content !== null && editedContent !== content;
  const isUnlocked = content !== null;

  return (
    <div className="fade-in flex h-full flex-col p-5">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-md border p-2 ${
            isUnlocked
              ? "border-key-gold/20 bg-key-gold/6 text-key-gold"
              : "border-white/6 bg-vault-raised text-ink-muted"
          }`}
        >
          {isUnlocked ? <LockOpenIcon /> : <Lock />}
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-mono text-sm font-medium text-ink-primary"
            title={path}
          >
            {path}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <span
                key={g}
                className="rounded border border-white/6 bg-vault-raised px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-tertiary"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-breach-red/20 bg-breach-red/6 px-4 py-3 text-xs text-breach-red">
          {error}
        </div>
      )}

      {/* Locked state */}
      {content === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-full border border-white/4 bg-vault-raised p-6">
            <Lock
              className={`text-ink-muted ${decrypting ? "" : "lock-pulse"}`}
              size={40}
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-ink-tertiary">
              This secret is encrypted
            </p>
          </div>
          <button
            onClick={onDecrypt}
            disabled={decrypting}
            className="flex items-center gap-2 rounded-md border border-key-gold/30 bg-key-gold/8 px-5 py-2 font-mono text-xs font-medium tracking-wide text-key-gold transition-all hover:border-key-gold/50 hover:bg-key-gold/12 disabled:opacity-40"
          >
            <UnlockKeyhole size={14} />
            {decrypting ? "Decrypting..." : "Decrypt"}
          </button>
        </div>
      ) : (
        /* Unlocked state */
        <div className="fade-in flex flex-1 flex-col">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="flex-1 resize-none rounded-md border border-white/6 bg-vault-abyss p-4 font-mono text-xs leading-relaxed text-ink-primary transition-colors focus:border-steel-dim focus:outline-none"
            spellCheck={false}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onSave(editedContent)}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 rounded-md border border-sealed-teal/30 bg-sealed-teal/8 px-4 py-1.5 font-mono text-xs font-medium tracking-wide text-sealed-teal transition-all hover:border-sealed-teal/50 hover:bg-sealed-teal/12 disabled:opacity-30"
            >
              <Lock size={13} />
              {saving ? "Encrypting..." : "Save & Encrypt"}
            </button>

            <div className="ml-auto">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-breach-red">
                    Destroy this secret?
                  </span>
                  <button
                    onClick={onDelete}
                    className="rounded-md border border-breach-red/30 bg-breach-red/8 px-3 py-1.5 text-xs font-medium text-breach-red transition-all hover:border-breach-red/50 hover:bg-breach-red/15"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-white/6 px-3 py-1.5 text-xs text-ink-tertiary transition-colors hover:border-white/10 hover:text-ink-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md border border-white/4 px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-breach-red/20 hover:text-breach-red"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
