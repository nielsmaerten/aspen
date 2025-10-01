import type { Schema } from 'paperless-node';

export type PaperlessDocument = Schema<'Document'>;
export type PaperlessTag = Schema<'Tag'>;
export type PaperlessCorrespondent = Schema<'Correspondent'>;
export type PaperlessDocumentType = Schema<'DocumentType'>;

export interface DocumentJob {
  document: PaperlessDocument;
  textContent: string;
  originalFile?: Buffer;
}
