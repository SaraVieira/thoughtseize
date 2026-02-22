export interface SecretFileInfo {
  path: string;
  groups: string[];
}

export interface ProjectInfo {
  path: string;
  secrets: SecretFileInfo[];
  groups: string[];
}

export interface IdentityInfo {
  path: string;
  key_type: string;
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
  groups?: string[];
}
