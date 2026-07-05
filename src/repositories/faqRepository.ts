import type { FaqEntry, FaqSearchFilters } from "../domain/faqEntry.js";
import { LocalFaqRepository } from "./localFaqRepository.js";

export type { FaqEntry, FaqSearchFilters };

export interface FaqRepository {
  search(filters: FaqSearchFilters): Promise<FaqEntry[]>;
  getById(id: string): Promise<FaqEntry | null>;
  listAll(): Promise<FaqEntry[]>;
}

let _instance: FaqRepository | null = null;

export function getRepository(): FaqRepository {
  if (!_instance) {
    _instance = new LocalFaqRepository();
  }
  return _instance;
}

// TODO: reemplazá LocalFaqRepository por tu propia fuente (CMS, base de datos, etc.)
// cuando este template deje de ser un ejemplo. Solo esta factory necesita cambiar —
// las tools del agente no dependen de la implementación concreta.
