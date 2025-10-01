import { z } from 'zod';
import { models } from 'token.js';

import { METADATA_FIELDS } from '../domain/metadata.js';
import type { MetadataField } from '../domain/metadata.js';
import type { AiProvider, AspenConfig } from './types.js';

type EnvShape = {
  PAPERLESS_BASE_URL?: string;
  PAPERLESS_API_TOKEN?: string;
  ASPEN_QUEUE_TAG?: string;
  ASPEN_PROCESSED_TAG?: string;
  ASPEN_REVIEW_TAG?: string;
  ASPEN_SET_TITLE?: string;
  ASPEN_SET_CORRESPONDENT?: string;
  ASPEN_SET_DATE?: string;
  ASPEN_SET_DOCTYPE?: string;
  ASPEN_ALLOW_NEW_DOCTYPES?: string;
  ASPEN_ALLOW_NEW_CORRESPONDENTS?: string;
  ASPEN_UPLOAD_ORIGINAL?: string;
  ASPEN_AI_PROVIDER?: string;
  ASPEN_AI_MODEL?: string;
  ASPEN_DEV_RUN_INTEGRATION?: string;
};

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off']);

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (TRUE_VALUES.has(normalized)) {
        return true;
      }
      if (FALSE_VALUES.has(normalized)) {
        return false;
      }
    }

    return value;
  }, z.boolean());

const tagSchema = z.string().trim().min(1, 'Tag names must not be empty');

const providerNames = Object.keys(models) as string[];

const envSchema = z.object({
  PAPERLESS_BASE_URL: z.string().trim().url('PAPERLESS_BASE_URL must be a valid URL'),
  PAPERLESS_API_TOKEN: z.string().trim().min(1, 'PAPERLESS_API_TOKEN must be set'),
  ASPEN_QUEUE_TAG: tagSchema.optional().default('$ai-queue'),
  ASPEN_PROCESSED_TAG: tagSchema.optional().default('$ai-processed'),
  ASPEN_REVIEW_TAG: tagSchema.optional().default('$ai-review'),
  ASPEN_SET_TITLE: booleanFromEnv(true),
  ASPEN_SET_CORRESPONDENT: booleanFromEnv(true),
  ASPEN_SET_DATE: booleanFromEnv(true),
  ASPEN_SET_DOCTYPE: booleanFromEnv(true),
  ASPEN_ALLOW_NEW_DOCTYPES: booleanFromEnv(false),
  ASPEN_ALLOW_NEW_CORRESPONDENTS: booleanFromEnv(false),
  ASPEN_UPLOAD_ORIGINAL: booleanFromEnv(false),
  ASPEN_AI_PROVIDER: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .default('openai')
    .refine((value) => providerNames.includes(value), {
      message: `ASPEN_AI_PROVIDER must be one of: ${providerNames.join(', ')}`,
    }),
  ASPEN_AI_MODEL: z.string().trim().min(1, 'ASPEN_AI_MODEL must be set'),
  ASPEN_DEV_RUN_INTEGRATION: booleanFromEnv(false),
});

let cachedConfig: AspenConfig | undefined;

function buildEnvSource(): EnvShape {
  const { PAPERLESS_BASE_URL, PAPERLESS_URL, PAPERLESS_API_TOKEN, PAPERLESS_TOKEN, ...rest } =
    process.env as EnvShape & {
      PAPERLESS_URL?: string;
      PAPERLESS_TOKEN?: string;
    };

  return {
    PAPERLESS_BASE_URL: PAPERLESS_BASE_URL ?? PAPERLESS_URL,
    PAPERLESS_API_TOKEN: PAPERLESS_API_TOKEN ?? PAPERLESS_TOKEN,
    ...rest,
  };
}

function assertProvider(value: string): asserts value is AiProvider {
  if (!(value in models)) {
    throw new Error(`Unsupported AI provider: ${value}`);
  }
}

function checkModelKnown(provider: AiProvider, model: string): void {
  const descriptor = models[provider];
  const knownModels = descriptor.models;
  if (Array.isArray(knownModels) && knownModels.length > 0 && !knownModels.includes(model)) {
    throw new Error(
      `Model '${model}' is not listed for provider '${provider}'. Set ASPEN_AI_MODEL to a supported value or update the model list via token.js`,
    );
  }
}

function supportsFeature(feature: boolean | readonly string[] | undefined, model: string): boolean {
  if (feature === true) {
    return true;
  }

  if (feature === false || feature === undefined) {
    return false;
  }

  return Array.isArray(feature) ? feature.includes(model) : false;
}

export function loadConfig(): AspenConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.parse(buildEnvSource());

  const tagValues = [parsed.ASPEN_QUEUE_TAG, parsed.ASPEN_PROCESSED_TAG, parsed.ASPEN_REVIEW_TAG];
  if (new Set(tagValues).size !== tagValues.length) {
    throw new Error('ASPEN_QUEUE_TAG, ASPEN_PROCESSED_TAG, and ASPEN_REVIEW_TAG must be unique');
  }

  const metadataTargets: Record<MetadataField, boolean> = {
    title: parsed.ASPEN_SET_TITLE,
    correspondent: parsed.ASPEN_SET_CORRESPONDENT,
    date: parsed.ASPEN_SET_DATE,
    doctype: parsed.ASPEN_SET_DOCTYPE,
  };

  if (!Object.values(metadataTargets).some(Boolean)) {
    throw new Error('Enable at least one metadata extractor via ASPEN_SET_* environment variables');
  }

  const provider = parsed.ASPEN_AI_PROVIDER;
  assertProvider(provider);
  const model = parsed.ASPEN_AI_MODEL;
  checkModelKnown(provider, model);

  const descriptor = models[provider];
  const supportsJson = supportsFeature(descriptor.supportsJSON, model);
  const supportsImages = supportsFeature(descriptor.supportsImages, model);

  const enabledFields = METADATA_FIELDS.filter((field) => metadataTargets[field]);

  cachedConfig = {
    paperless: {
      baseUrl: parsed.PAPERLESS_BASE_URL,
      token: parsed.PAPERLESS_API_TOKEN,
      tags: {
        queue: parsed.ASPEN_QUEUE_TAG,
        processed: parsed.ASPEN_PROCESSED_TAG,
        review: parsed.ASPEN_REVIEW_TAG,
      },
    },
    metadata: {
      targets: metadataTargets,
      enabledFields,
      allowNewCorrespondents: parsed.ASPEN_ALLOW_NEW_CORRESPONDENTS,
      allowNewDocumentTypes: parsed.ASPEN_ALLOW_NEW_DOCTYPES,
    },
    ai: {
      provider,
      model,
      uploadOriginal: parsed.ASPEN_UPLOAD_ORIGINAL && supportsImages,
      features: {
        supportsJson,
        supportsImages,
      },
    },
    dev: {
      runIntegration: parsed.ASPEN_DEV_RUN_INTEGRATION,
    },
  } satisfies AspenConfig;

  return cachedConfig;
}

export function clearCachedConfig(): void {
  cachedConfig = undefined;
}
