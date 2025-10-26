import { z } from 'zod';

type Status = 'ok' | 'unknown';

const basicStatusSchema = z.enum(['ok', 'unknown']);
const basicReasonSchema = z.string().max(512).optional();
const basicEntityValueSchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    create: z.boolean().optional(),
    reason: z.string().max(512).optional(),
  })
  .strip();

export const BasicTitleResponseSchema = z
  .object({
    status: basicStatusSchema,
    value: z.string().trim().min(1).max(128).nullable().optional(),
    reason: basicReasonSchema,
  })
  .strip();

export const BasicDateResponseSchema = z
  .object({
    status: basicStatusSchema,
    value: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    reason: basicReasonSchema,
  })
  .strip();

export const BasicCorrespondentResponseSchema = z
  .object({
    status: basicStatusSchema,
    value: basicEntityValueSchema.nullable().optional(),
    reason: basicReasonSchema,
  })
  .strip();

export const BasicDoctypeResponseSchema = z
  .object({
    status: basicStatusSchema,
    value: basicEntityValueSchema.nullable().optional(),
    reason: basicReasonSchema,
  })
  .strip();

const normalizeStatus = (value: unknown): Status => {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (typeof value === 'boolean') {
    return value ? 'ok' : 'unknown';
  }

  if (typeof value === 'number') {
    return value > 0 ? 'ok' : 'unknown';
  }

  const normalized = String(value).trim().toLowerCase();
  if (['ok', 'okay', 'success', 'done'].includes(normalized)) {
    return 'ok';
  }

  if (['unknown', 'unsure', 'na', 'n/a', 'none'].includes(normalized)) {
    return 'unknown';
  }

  return 'unknown';
};

const statusSchema = z.any().transform<Status>((value) => normalizeStatus(value));

const maybeText = (max = 512) =>
  z.any().transform<string | undefined>((value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed.slice(0, max) : undefined;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed.slice(0, max) : undefined;
    }

    return undefined;
  });

const booleanLike = z.any().transform<boolean | undefined>((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return undefined;
    }

    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', 't', 'yes', 'y', '1'].includes(normalized)) {
      return true;
    }

    if (['false', 'f', 'no', 'n', '0'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
});

const toNullable = <T>(schema: z.ZodType<T | undefined>) =>
  schema.transform<T | null>((value) => (value === undefined ? null : value));

const reasonField = maybeText(512);

const titleValueSchema = toNullable(maybeText(120));

const isoDateValueSchema = toNullable(
  maybeText(64).transform((value) => {
    if (!value) {
      return undefined;
    }

    const normalized = value.replace(/[./]/g, '-');
    const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) {
      return undefined;
    }

    const [, year, monthRaw, dayRaw] = match;
    const month = monthRaw.padStart(2, '0');
    const day = dayRaw.padStart(2, '0');
    const iso = `${year}-${month}-${day}`;
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return iso;
  }),
);

type EntityValue = {
  name?: string;
  create?: boolean;
  reason?: string;
};

const entityValueSchema = toNullable(
  z
    .any()
    .transform<EntityValue | undefined>((value) => {
      if (value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return { name: String(value) };
      }

      if (typeof value === 'object') {
        return value as EntityValue;
      }

      return undefined;
    })
    .pipe(
      z
        .object({
          name: maybeText(128),
          create: booleanLike,
          reason: reasonField,
        })
        .partial()
        .optional(),
    )
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      return {
        name: value.name,
        create: value.create,
        reason: value.reason,
      };
    }),
);

const createResponseSchema = <ValueSchema extends z.ZodTypeAny>(
  valueSchema: ValueSchema,
  options: { requireEntityName?: boolean } = {},
) =>
  z
    .object({
      status: statusSchema,
      value: valueSchema.optional(),
      reason: reasonField.optional(),
    })
    .passthrough()
    .transform((data) => ({
      status: data.status,
      value: data.value ?? null,
      reason: data.reason ?? undefined,
    }))
    .superRefine((data, ctx) => {
      if (data.status === 'ok' && (data.value === null || data.value === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'value is required when status is ok',
          path: ['value'],
        });
      }

      if (options.requireEntityName && data.status === 'ok' && data.value) {
        const candidate = data.value as EntityValue;
        if (!candidate.name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'name is required when status is ok',
            path: ['value', 'name'],
          });
        }
      }
    });

export const TitleResponseSchema = createResponseSchema(titleValueSchema);

export const DateResponseSchema = createResponseSchema(isoDateValueSchema);

export const CorrespondentResponseSchema = createResponseSchema(entityValueSchema, {
  requireEntityName: true,
});

export const DoctypeResponseSchema = createResponseSchema(entityValueSchema, {
  requireEntityName: true,
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
