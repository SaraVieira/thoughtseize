import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TopBar } from "./components/TopBar";
import { TreeSidebar } from "./components/TreeSidebar";
import { WelcomePanel } from "./components/WelcomePanel";
import { SecretDetail } from "./components/SecretDetail";
import { CreateSecret } from "./components/CreateSecret";
import { IdentityPicker } from "./components/IdentityPicker";
import { useProject } from "./hooks/useProject";
import { useSecret } from "./hooks/useSecret";
import { Key, Plus } from "lucide-react";

type View = "welcome" | "detail" | "create";

function App() {
  const { project, tree, error: projectError, openProject, refresh } = useProject();
  const { content, decrypting, saving, error, decrypt, save, clear } =
    useSecret();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [view, setView] = useState<View>("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [showIdentityPicker, setShowIdentityPicker] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Restore previously selected identity on startup
  useEffect(() => {
    invoke<string | null>("get_saved_identity").catch(() => null);
  }, []);

  const selectedSecret = project?.secrets.find((s) => s.path === selectedPath);

  const handleSelect = useCallback(
    (path: string) => {
      setSelectedPath(path);
      setView("detail");
      setDeleteError(null);
      clear();
    },
    [clear],
  );

  const handleDecrypt = useCallback(() => {
    if (selectedPath) decrypt(selectedPath);
  }, [selectedPath, decrypt]);

  const handleSave = useCallback(
    (newContent: string) => {
      if (selectedPath) save(selectedPath, newContent);
    },
    [selectedPath, save],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedPath) return;
    setDeleteError(null);
    try {
      await invoke("delete_secret", { relativePath: selectedPath });
      setSelectedPath(null);
      setView("welcome");
      refresh();
    } catch (e) {
      setDeleteError(String(e));
    }
  }, [selectedPath, refresh]);

  return (
    <div className="flex h-screen flex-col bg-vault-deep text-ink-primary">
      <TopBar
        projectPath={project?.path ?? null}
        onOpenProject={openProject}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 flex-col border-r border-white/6 bg-vault-deep">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-2.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
              Secrets
            </span>
            <div className="flex gap-1">
              {project && (
                <button
                  onClick={() => setView("create")}
                  className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-white/4 hover:text-key-gold"
                  title="New secret"
                >
                  <Plus size={14} />
                </button>
              )}
              <button
                onClick={() => setShowIdentityPicker(true)}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-white/4 hover:text-key-gold"
                title="Identity settings"
              >
                <Key size={14} />
              </button>
            </div>
          </div>
          <TreeSidebar
            nodes={tree}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            searchQuery={searchQuery}
          />
        </aside>
        <main className="flex-1 overflow-y-auto bg-vault-base">
          {projectError && (
            <div className="mx-5 mt-4 rounded-md border border-breach-red/20 bg-breach-red/[0.06] px-4 py-3 text-xs text-breach-red">
              {projectError}
            </div>
          )}
          {view === "welcome" && (
            <WelcomePanel
              secretCount={project?.secrets.length ?? 0}
              groupCount={project?.groups.length ?? 0}
              hasProject={!!project}
            />
          )}
          {view === "detail" && selectedSecret && (
            <SecretDetail
              path={selectedSecret.path}
              groups={selectedSecret.groups}
              content={content}
              decrypting={decrypting}
              saving={saving}
              error={error || deleteError}
              onDecrypt={handleDecrypt}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}
          {view === "create" && project && (
            <CreateSecret
              availableGroups={project.groups}
              onCreated={() => {
                setView("welcome");
                refresh();
              }}
              onCancel={() => setView("welcome")}
            />
          )}
        </main>
      </div>

      {showIdentityPicker && (
        <IdentityPicker onClose={() => setShowIdentityPicker(false)} />
      )}
    </div>
  );
}

export default App;
