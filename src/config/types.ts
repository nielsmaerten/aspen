import type { MetadataField } from '../domain/metadata.js';

export type TokenModels = typeof import('token.js').models;

export type AiProvider = keyof TokenModels;

export interface MetadataConfig {
  targets: Record<MetadataField, boolean>;
  enabledFields: MetadataField[];
  allowNewDocumentTypes: boolean;
  allowNewCorrespondents: boolean;
}

export interface AspenConfig {
  paperless: {
    baseUrl: string;
    token: string;
    tags: {
      queue: string;
      processed: string;
      review: string;
    };
  };
  metadata: MetadataConfig;
  ai: {
    provider: AiProvider;
    model: string;
    uploadOriginal: boolean;
    features: {
      supportsJson: boolean;
      supportsImages: boolean;
    };
  };
  dev: {
    runIntegration: boolean;
  };
}
