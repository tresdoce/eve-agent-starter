import { defineTool } from "eve/tools";
import { z } from "zod";
import { getRepository } from "../../src/repositories/faqRepository.js";
import { FaqCategorySchema } from "../../src/domain/faqEntry.js";

export default defineTool({
  description:
    "Busca en la base de conocimiento (FAQ) por texto libre y/o categoría. Llamala siempre antes de responder una pregunta de soporte para no inventar información.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Texto libre a buscar (se compara contra pregunta, respuesta y keywords)"),
    category: FaqCategorySchema.optional().describe(
      "Filtra por categoría solo si el cliente la mencionó explícitamente"
    ),
  }),
  async execute(input) {
    const repo = getRepository();
    const results = await repo.search({ query: input.query, category: input.category });
    return { results, count: results.length };
  },
});
