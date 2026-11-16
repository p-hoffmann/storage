// Stub for fs-xattr: replaces native .node addon with JSON sidecar files.
// Stores extended attributes in a .xattr.json file next to the target file.
import { readFile, writeFile } from 'node:fs/promises';

function metaPath(file) {
  return file + '.xattr.json';
}

async function readMeta(file) {
  try {
    return JSON.parse(await readFile(metaPath(file), 'utf-8'));
  } catch {
    return {};
  }
}

async function writeMeta(file, meta) {
  await writeFile(metaPath(file), JSON.stringify(meta));
}

export async function get(file, attribute) {
  const meta = await readMeta(file);
  const value = meta[attribute];
  return value !== undefined ? Buffer.from(value) : undefined;
}

export async function set(file, attribute, value) {
  const meta = await readMeta(file);
  if (value === undefined || value === null) {
    delete meta[attribute];
  } else {
    meta[attribute] = typeof value === 'string' ? value : value.toString();
  }
  await writeMeta(file, meta);
}

export async function remove(file, attribute) {
  const meta = await readMeta(file);
  delete meta[attribute];
  await writeMeta(file, meta);
}

export async function list(file) {
  const meta = await readMeta(file);
  return Object.keys(meta);
}

export default { get, set, remove, list };
