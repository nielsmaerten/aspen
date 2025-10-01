import { z } from 'zod';

const unknownResponseSchema = z.object({
  status: z.literal('unknown'),
  reason: z.string().optional(),
});

export const TitleResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    value: z.string().trim().min(1).max(128),
    confidence: z.number().min(0).max(1).optional(),
    reason: z.string().optional(),
  }),
  unknownResponseSchema,
]);

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
  });

export const DateResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    value: isoDate,
    reason: z.string().optional(),
  }),
  unknownResponseSchema,
]);

const entityValueSchema = z.object({
  name: z.string().trim().min(1).max(128),
  create: z.boolean().optional(),
  reason: z.string().optional(),
});

export const CorrespondentResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    value: entityValueSchema,
  }),
  unknownResponseSchema,
]);

export const DoctypeResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    value: entityValueSchema,
  }),
  unknownResponseSchema,
]);

type TitleResponse = z.infer<typeof TitleResponseSchema>;
export type DateResponse = z.infer<typeof DateResponseSchema>;
export type CorrespondentResponse = z.infer<typeof CorrespondentResponseSchema>;
export type DoctypeResponse = z.infer<typeof DoctypeResponseSchema>;

export type StructuredResponse =
  | TitleResponse
  | DateResponse
  | CorrespondentResponse
  | DoctypeResponse;
