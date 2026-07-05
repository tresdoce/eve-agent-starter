import { z } from "zod";

export const FaqCategorySchema = z.enum(["billing", "account", "product", "shipping", "other"]);

export const FaqEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: FaqCategorySchema,
  keywords: z.array(z.string()),
});

export type FaqEntry = z.infer<typeof FaqEntrySchema>;
export type FaqCategory = z.infer<typeof FaqCategorySchema>;

export interface FaqSearchFilters {
  query?: string;
  category?: FaqCategory;
}
