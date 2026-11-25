export type FolderNode = {
  kind: "folder";
  name: string;
  path: string;
  children: TreeNode[];
};

export type FileNode = {
  kind: "file";
  name: string;
  path: string;
};

export type TreeNode = FolderNode | FileNode;

const compareNames = (first: string, second: string): number =>
  first.localeCompare(second, undefined, { sensitivity: "base" });

const compareNodes = (first: TreeNode, second: TreeNode): number => {
  if (first.kind !== second.kind) {
    return first.kind === "folder" ? -1 : 1;
  }

  return compareNames(first.name, second.name);
};

const sortTree = (nodes: TreeNode[]): TreeNode[] => {
  nodes.sort(compareNodes);
  nodes.forEach((node) => {
    if (node.kind === "folder") {
      sortTree(node.children);
    }
  });

  return nodes;
};

const findOrCreateFolder = (siblings: TreeNode[], name: string, path: string): FolderNode => {
  const existing = siblings.find((node): node is FolderNode => node.kind === "folder" && node.name === name);

  if (existing) {
    return existing;
  }

  const created: FolderNode = { kind: "folder", name, path, children: [] };
  siblings.push(created);

  return created;
};

const addFile = (siblings: TreeNode[], name: string, path: string): void => {
  const alreadyListed = siblings.some((node) => node.kind === "file" && node.name === name);

  if (!alreadyListed) {
    siblings.push({ kind: "file", name, path });
  }
};

const insertPath = (root: TreeNode[], path: string): void => {
  const segments = path.split("/").filter((segment) => segment !== "");
  const fileName = segments.pop();

  if (fileName === undefined) {
    return;
  }

  let siblings = root;
  let folderPath = "";

  segments.forEach((segment) => {
    folderPath = folderPath === "" ? segment : `${folderPath}/${segment}`;
    siblings = findOrCreateFolder(siblings, segment, folderPath).children;
  });

  addFile(siblings, fileName, folderPath === "" ? fileName : `${folderPath}/${fileName}`);
};

export const buildFileTree = (paths: readonly string[]): TreeNode[] => {
  const root: TreeNode[] = [];
  paths.forEach((path) => insertPath(root, path));

  return sortTree(root);
};
