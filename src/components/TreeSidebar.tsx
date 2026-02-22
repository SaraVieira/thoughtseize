import { useState } from "react";
import type { TreeNode } from "../types";
import { Folder, FolderOpen, Lock } from "lucide-react";

interface TreeSidebarProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  searchQuery: string;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.isFile) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`group flex w-full items-center gap-2 py-1.5 pr-3 text-left transition-colors ${
          isSelected
            ? "bg-key-gold/8 text-key-gold"
            : "text-ink-secondary hover:bg-white/3 hover:text-ink-primary"
        }`}
        title={node.path}
      >
        <Lock
          size={12}
          className={`shrink-0 ${isSelected ? "text-key-gold" : "text-ink-muted group-hover:text-ink-tertiary"}`}
        />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className="flex w-full items-center gap-2 py-1.5 pr-3 text-left transition-colors hover:bg-white/3"
      >
        {expanded ? (
          <FolderOpen size={12} className="shrink-0 text-ink-muted" />
        ) : (
          <Folder size={12} className="shrink-0 text-ink-muted" />
        )}
        <span className="truncate text-xs font-medium tracking-wide text-ink-tertiary">
          {node.name}
        </span>
      </button>
      {expanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  const lower = query.toLowerCase();
  return nodes
    .map((node) => {
      if (node.isFile) {
        return node.path.toLowerCase().includes(lower) ? node : null;
      }
      const filteredChildren = filterTree(node.children, query);
      return filteredChildren.length > 0
        ? { ...node, children: filteredChildren }
        : null;
    })
    .filter(Boolean) as TreeNode[];
}

export function TreeSidebar({
  nodes,
  selectedPath,
  onSelect,
  searchQuery,
}: TreeSidebarProps) {
  const filtered = filterTree(nodes, searchQuery);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <Lock size={32} className="text-ink-muted" />
        <p className="text-xs text-ink-muted">
          {nodes.length === 0 ? "No vault open" : "No secrets match"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto py-1">
      {filtered.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
