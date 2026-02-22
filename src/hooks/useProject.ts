import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectInfo, TreeNode, SecretFileInfo } from "../types";

function buildTree(secrets: SecretFileInfo[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [], isFile: false };

  for (const secret of secrets) {
    const parts = secret.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          children: [],
          isFile,
          groups: isFile ? secret.groups : undefined,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: folders first, then alphabetical
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root.children;
}

export function useProject() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProject = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const info = await invoke<ProjectInfo>("open_project", { dir });
      setProject(info);
      setTree(buildTree(info.secrets));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore last opened project on startup
  useEffect(() => {
    invoke<string | null>("get_saved_project").then((dir) => {
      if (dir) loadProject(dir);
    }).catch(() => {});
  }, [loadProject]);

  const openProject = useCallback(async () => {
    const dir = await open({ directory: true });
    if (!dir) return;
    await loadProject(dir);
  }, [loadProject]);

  const refresh = useCallback(async () => {
    if (!project) return;
    try {
      const info = await invoke<ProjectInfo>("open_project", {
        dir: project.path,
      });
      setProject(info);
      setTree(buildTree(info.secrets));
    } catch (e) {
      setError(String(e));
    }
  }, [project]);

  return { project, tree, error, loading, openProject, refresh };
}
