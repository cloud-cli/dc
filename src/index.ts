import { getConfig, init } from "@cloud-cli/cli";
import { exec } from "@cloud-cli/exec";
import { existsSync, mkdirSync } from "node:fs";
import { readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const config = getConfig("dc", { storagePath: "docker-compose" });
const storagePath = join(process.cwd(), config.storagePath);

interface CliOptions {
  name: string;
  content?: string;
}

const getPath = (name) => join(storagePath, name + ".yml");
const checkName = (name) => {
  if (!name) {
    throw new Error("Name is required");
  }

  // TODO sanitize file name
  return name;
};

async function stop(options: CliOptions) {
  const name = checkName(options.name);
  const path = getPath(name);

  if (!existsSync(path)) {
    throw new Error("Service not found");
  }

  const out = await exec("docker compose", ["down", "-f", path]);

  if (out.ok) {
    return true;
  }

  throw new Error(out.stderr);
}

async function start(options: CliOptions) {
  const name = checkName(options.name);
  const path = getPath(name);

  if (!existsSync(path)) {
    throw new Error("Service not found");
  }

  const out = await exec("docker compose", ["up", "-f", path]);

  if (out.ok) {
    return true;
  }

  throw new Error(out.stderr);
}

async function update(options: CliOptions) {
  const name = checkName(options.name);
  const { content } = options;

  if (!content) {
    throw new Error("docker compose content is required");
  }

  const path = getPath(name);
  await writeFile(path, String(options.content));
  return true;
}

async function remove(options: CliOptions) {
  const name = checkName(options.name);
  const path = getPath(name);

  if (existsSync(path)) {
    await rm(path);
  }

  return true;
}

async function list() {
  const files = await readdir(storagePath, { withFileTypes: true });
  return files.filter((f) => f.isFile()).map((f) => f.name.replace(".yml", ""));
}

export default {
  [init]() {
    mkdirSync(storagePath, { recursive: true });
  },
  start,
  stop,
  update,
  remove,
  list,
};
