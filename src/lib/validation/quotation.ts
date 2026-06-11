import { z } from "zod";

const quotationItemType = z.enum([
  "package",
  "hotel",
  "flight",
  "visa",
  "transport",
  "insurance",
  "other",
]);

export const quotationItemInputSchema = z.object({
  item_type: quotationItemType,
  description: z.string().min(1).max(2000),
  package_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const quotationCreateSchema = z.object({
  opportunity_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).optional(),
  valid_until: z.string().date().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  terms_and_conditions: z.string().max(10000).optional().nullable(),
  discount_amount: z.coerce.number().min(0).optional(),
  tax_amount: z.coerce.number().min(0).optional(),
  items: z.array(quotationItemInputSchema).optional(),
  source_quotation_id: z.string().uuid().optional(),
});

export const quotationUpdateSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  valid_until: z.string().date().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  terms_and_conditions: z.string().max(10000).optional().nullable(),
  discount_amount: z.coerce.number().min(0).optional(),
  tax_amount: z.coerce.number().min(0).optional(),
});

export const quotationRejectSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const quotationItemCreateSchema = quotationItemInputSchema;

export const quotationItemUpdateSchema = quotationItemInputSchema.partial();

export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;
export type QuotationUpdateInput = z.infer<typeof quotationUpdateSchema>;
export type QuotationItemInput = z.infer<typeof quotationItemInputSchema>;
