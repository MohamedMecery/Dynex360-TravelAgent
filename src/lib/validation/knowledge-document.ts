import { z } from "zod";

export const knowledgeDocumentCreateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  document_type: z.enum(["policy", "faq", "contract", "package", "sop"]).default("policy"),
  content: z.string().trim().min(1).max(200_000),
});

export type KnowledgeDocumentCreate = z.infer<typeof knowledgeDocumentCreateSchema>;
