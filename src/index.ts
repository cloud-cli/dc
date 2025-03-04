import { getConfig, init } from "@cloud-cli/cli";
import { exec } from "@cloud-cli/exec";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const config = getConfig("dc", { storagePath: "docker-compose" });
const storagePath = join(process.cwd(), config.storagePath);
const notFoundError = new Error("Service not found");
const binaryAndArgs = {
  binary: "",
  args: [],
};

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
    throw notFoundError;
  }

  const out = await exec(
    binaryAndArgs.binary,
    [...binaryAndArgs.args, "-f", path, "down"].filter(Boolean)
  );

  if (out.ok) {
    return true;
  }

  throw new Error(out.stderr);
}

async function start(options: CliOptions) {
  const name = checkName(options.name);
  const path = getPath(name);

  if (!existsSync(path)) {
    throw notFoundError;
  }

  const out = await exec(
    binaryAndArgs.binary,
    [...binaryAndArgs.args, "-f", path, "up", "-d"].filter(Boolean)
  );

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

async function show(options: CliOptions) {
  const name = checkName(options.name);
  const path = getPath(name);

  if (existsSync(path)) {
    const content = await readFile(path, "utf-8");
    return { name, content };
  }

  throw notFoundError;
}

export default {
  async [init]() {
    mkdirSync(storagePath, { recursive: true });

    const docker = await exec("docker", ["compose"]);
    if (docker.ok) {
      binaryAndArgs.binary = "docker";
      binaryAndArgs.args.push("compose");
      return;
    }

    const dockerCompose = await exec("docker-compose", ["--help"]);
    if (dockerCompose.ok) {
      binaryAndArgs.binary = "docker-compose";
      return;
    }

    binaryAndArgs.binary = "exit";
    binaryAndArgs.args.push("1");
  },
  start,
  stop,
  update,
  remove,
  show,
  list,
};
