import { z } from 'zod';

export const TitleResponseSchema = z
  .object({
    status: z.enum(['ok', 'unknown']),
    value: z.union([z.string().trim().min(1).max(128), z.null()]),
    confidence: z.union([z.number().min(0).max(1), z.null()]),
    reason: z.union([z.string(), z.null()]),
  })
  .superRefine((obj, ctx) => {
    if (obj.status === 'ok') {
      if (obj.value === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'value is required when status is ok',
          path: ['value'],
        });
      }
    }
  });

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
  });

export const DateResponseSchema = z
  .object({
    status: z.enum(['ok', 'unknown']),
    value: z.union([isoDate, z.null()]),
    reason: z.union([z.string(), z.null()]),
  })
  .superRefine((obj, ctx) => {
    if (obj.status === 'ok') {
      if (obj.value === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'value is required when status is ok',
          path: ['value'],
        });
      }
    }
  });

const entityValueSchema = z.object({
  name: z.string().trim().min(1).max(128),
  create: z.union([z.boolean(), z.null()]),
  reason: z.union([z.string(), z.null()]),
});

export const CorrespondentResponseSchema = z
  .object({
    status: z.enum(['ok', 'unknown']),
    value: z.union([entityValueSchema, z.null()]),
    reason: z.union([z.string(), z.null()]),
  })
  .superRefine((obj, ctx) => {
    if (obj.status === 'ok') {
      if (obj.value === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'value is required when status is ok',
          path: ['value'],
        });
      }
    }
  });

export const DoctypeResponseSchema = z
  .object({
    status: z.enum(['ok', 'unknown']),
    value: z.union([entityValueSchema, z.null()]),
    reason: z.union([z.string(), z.null()]),
  })
  .superRefine((obj, ctx) => {
    if (obj.status === 'ok') {
      if (obj.value === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'value is required when status is ok',
          path: ['value'],
        });
      }
    }
  });

type TitleResponse = z.infer<typeof TitleResponseSchema>;
export type DateResponse = z.infer<typeof DateResponseSchema>;
export type CorrespondentResponse = z.infer<typeof CorrespondentResponseSchema>;
export type DoctypeResponse = z.infer<typeof DoctypeResponseSchema>;

export type StructuredResponse =
  | TitleResponse
  | DateResponse
  | CorrespondentResponse
  | DoctypeResponse;
