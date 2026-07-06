import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { FaqEntrySchema } from "../domain/faqEntry.js";
import type { FaqEntry, FaqSearchFilters, FaqRepository } from "./faqRepository.js";
import { normalizeText } from "../lib/normalize.js";

const KnowledgeBaseSchema = z.array(FaqEntrySchema);

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "mi",
  "tu",
  "su",
  "un",
  "una",
  "que",
  "como",
  "para",
  "por",
  "en",
  "es",
  "y",
  "o",
  "a",
  "al",
  "no",
]);

function significantWords(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function loadKnowledgeBase(): FaqEntry[] {
  const path = resolve(process.cwd(), "knowledge-base/faqs.json");
  const raw = readFileSync(path, "utf-8");
  return KnowledgeBaseSchema.parse(JSON.parse(raw));
}

export class LocalFaqRepository implements FaqRepository {
  private entries: FaqEntry[];

  constructor() {
    this.entries = loadKnowledgeBase();
  }

  async listAll(): Promise<FaqEntry[]> {
    return this.entries;
  }

  async getById(id: string): Promise<FaqEntry | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  async search(filters: FaqSearchFilters): Promise<FaqEntry[]> {
    return this.entries.filter((e) => {
      if (filters.category && e.category !== filters.category) return false;

      if (filters.query) {
        const queryWords = significantWords(filters.query);
        const haystack = normalizeText([e.question, e.answer, ...e.keywords].join(" "));
        if (queryWords.length > 0 && !queryWords.some((word) => haystack.includes(word))) {
          return false;
        }
      }

      return true;
    });
  }
}
