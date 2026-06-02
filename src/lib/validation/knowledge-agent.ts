import { z } from "zod";

const aiLocaleSchema = z.enum(["en", "ar"]).optional();

export const knowledgeAgentRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000),
  conversation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  locale: aiLocaleSchema,
  document_type: z
    .enum(["policy", "faq", "contract", "package", "sop"])
    .optional(),
});

export type KnowledgeAgentRequest = z.infer<typeof knowledgeAgentRequestSchema>;
