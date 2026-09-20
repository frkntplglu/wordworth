import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { OxfordLookup } from "../domain/types.ts";

type OxfordEntry = {
  word?: unknown;
  cefr?: unknown;
};

type OxfordDataset = Record<string, OxfordEntry>;

export class DatasetError extends Error {
  readonly code = "DATASET_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatasetError";
  }
}

export async function loadOxfordLookup(
  datasetPath = getDefaultDatasetPath(),
): Promise<Map<string, string>> {
  let raw: string;
  try {
    raw = await readFile(datasetPath, "utf8");
  } catch (error) {
    throw new DatasetError(`Could not read Oxford dataset at ${datasetPath}.`, {
      cause: error,
    });
  }

  let dataset: OxfordDataset;
  try {
    dataset = JSON.parse(raw) as OxfordDataset;
  } catch (error) {
    throw new DatasetError("The Oxford dataset is not valid JSON.", { cause: error });
  }

  const lookup = new Map<string, string>();
  for (const entry of Object.values(dataset)) {
    if (typeof entry.word !== "string" || typeof entry.cefr !== "string") {
      continue;
    }

    const word = entry.word.trim().toLowerCase();
    const cefr = entry.cefr.trim().toUpperCase();
    if (word && cefr && !lookup.has(word)) {
      lookup.set(word, cefr);
    }
  }

  if (lookup.size === 0) {
    throw new DatasetError("The Oxford dataset did not contain any valid entries.");
  }

  return lookup;
}

function getDefaultDatasetPath() {
  const configuredPath = process.env.WORDWORTH_DATASET_PATH?.trim();
  if (configuredPath) return configuredPath;

  const executableSharePath = resolve(
    dirname(process.execPath),
    "../share/wordworth/oxford_5000_simple.json",
  );
  const sourcePath = resolve(import.meta.dir, "../../oxford_5000_simple.json");

  return [executableSharePath, sourcePath].find((candidate) => existsSync(candidate)) ?? executableSharePath;
}

export function lookupOxford(
  lookup: Map<string, string>,
  word: string,
): OxfordLookup {
  const cefr = lookup.get(word.trim().toLowerCase()) ?? null;
  return { found: cefr !== null, cefr };
}
