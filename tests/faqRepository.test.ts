import { describe, it, expect, beforeAll } from "vitest";
import { LocalFaqRepository } from "../src/repositories/localFaqRepository.js";
import { FaqEntrySchema } from "../src/domain/faqEntry.js";
import { z } from "zod";

let repo: LocalFaqRepository;

beforeAll(() => {
  repo = new LocalFaqRepository();
});

describe("LocalFaqRepository", () => {
  it("carga la base de conocimiento sin errores", async () => {
    const entries = await repo.listAll();
    expect(entries.length).toBeGreaterThan(0);
  });

  it("todas las entradas cumplen el schema", async () => {
    const entries = await repo.listAll();
    const KnowledgeBaseSchema = z.array(FaqEntrySchema);
    expect(() => KnowledgeBaseSchema.parse(entries)).not.toThrow();
  });

  it("filtra correctamente por categoría", async () => {
    const results = await repo.search({ category: "billing" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.category === "billing")).toBe(true);
  });

  it("busca por texto en la pregunta", async () => {
    const results = await repo.search({ query: "contraseña" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("busca por keyword aunque no aparezca en la pregunta", async () => {
    const results = await repo.search({ query: "tracking" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("devuelve vacío cuando no hay coincidencias", async () => {
    const results = await repo.search({ query: "algo-que-no-existe-en-la-faq" });
    expect(results).toHaveLength(0);
  });

  it("combina query y categoría", async () => {
    const results = await repo.search({ query: "cuenta", category: "account" });
    expect(results.every((e) => e.category === "account")).toBe(true);
  });

  it("getById devuelve la entrada correcta", async () => {
    const entry = await repo.getById("faq-001");
    expect(entry).not.toBeNull();
    expect(entry?.category).toBe("account");
  });

  it("getById devuelve null para un ID inexistente", async () => {
    const entry = await repo.getById("no-existe-999");
    expect(entry).toBeNull();
  });
});
