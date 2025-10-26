import type { DocumentJob } from './document.js';

export const METADATA_FIELDS = ['title', 'correspondent', 'date', 'doctype'] as const;

export type MetadataField = (typeof METADATA_FIELDS)[number];

export interface ExistingEntitySelection {
  type: 'existing';
  id: number;
  name: string;
}

export interface NewEntitySelection {
  type: 'new';
  name: string;
}

export type EntitySelection = ExistingEntitySelection | NewEntitySelection;

export type MetadataValueMap = {
  title: string;
  correspondent: EntitySelection;
  date: string;
  doctype: EntitySelection;
};

export type MetadataOutcomeType = 'ok' | 'unknown' | 'invalid';

export interface MetadataResultBase<Field extends MetadataField> {
  field: Field;
  type: MetadataOutcomeType;
  message?: string;
}

export interface MetadataSuccess<Field extends MetadataField, Value>
  extends MetadataResultBase<Field> {
  type: 'ok';
  value: Value;
}

export interface MetadataUnknown<Field extends MetadataField> extends MetadataResultBase<Field> {
  type: 'unknown';
}

export interface MetadataInvalid<Field extends MetadataField> extends MetadataResultBase<Field> {
  type: 'invalid';
}

export type MetadataResult<Field extends MetadataField, Value> =
  | MetadataSuccess<Field, Value>
  | MetadataUnknown<Field>
  | MetadataInvalid<Field>;

export interface MetadataExtractionOptions {
  includeOriginalFile?: boolean;
}

export interface MetadataStrategy<Field extends MetadataField, Value, Context = unknown> {
  readonly field: Field;
  extract(
    job: DocumentJob,
    context: Context,
    options?: MetadataExtractionOptions,
  ): Promise<MetadataResult<Field, Value>>;
}
