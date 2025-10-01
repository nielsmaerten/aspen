import { createPaperlessClient, type PaperlessClient } from 'paperless-node';

import type { AspenConfig } from '../config/types.js';
import type {
  PaperlessCorrespondent,
  PaperlessDocument,
  PaperlessDocumentType,
  PaperlessTag,
} from '../domain/document.js';

export interface DocumentUpdatePayload {
  title?: string;
  correspondent?: number | null;
  document_type?: number | null;
  created?: string;
  tags?: number[];
  remove_inbox_tags?: boolean | null;
}

export class PaperlessService {
  constructor(private readonly client: PaperlessClient) {}

  static fromConfig(config: AspenConfig['paperless']): PaperlessService {
    const client = createPaperlessClient({
      baseURL: config.baseUrl,
      token: config.token,
    });

    return new PaperlessService(client);
  }

  async fetchTagByName(name: string): Promise<PaperlessTag | null> {
    const response = await this.client.tags.list({
      name__iexact: name,
      page_size: 1,
    });

    return response.results[0] ?? null;
  }

  async createTag(name: string): Promise<PaperlessTag> {
    return this.client.tags.create({
      name,
    });
  }

  async listCorrespondents(): Promise<PaperlessCorrespondent[]> {
    return this.client.correspondents.listAll({
      ordering: 'name',
      page_size: 250,
    });
  }

  async listDocumentTypes(): Promise<PaperlessDocumentType[]> {
    return this.client.documentTypes.listAll({
      ordering: 'name',
      page_size: 250,
    });
  }

  async createCorrespondent(name: string): Promise<PaperlessCorrespondent> {
    return this.client.correspondents.create({ name });
  }

  async createDocumentType(name: string): Promise<PaperlessDocumentType> {
    return this.client.documentTypes.create({ name });
  }

  async fetchNextQueuedDocument(tagId: number): Promise<PaperlessDocument | null> {
    const response = await this.client.documents.list({
      tags__id__all: tagId,
      ordering: 'added',
      page_size: 1,
    });

    return response.results[0] ?? null;
  }

  async retrieveDocument(id: number): Promise<PaperlessDocument> {
    return this.client.documents.retrieve(id);
  }

  async updateDocument(id: number, payload: DocumentUpdatePayload): Promise<PaperlessDocument> {
    const { remove_inbox_tags, ...rest } = payload;
    return this.client.documents.partialUpdate(id, {
      remove_inbox_tags: remove_inbox_tags ?? false,
      ...rest,
    });
  }

  async downloadOriginal(id: number): Promise<Buffer> {
    const data = await this.client.documents.download(id, {
      original: true,
      responseType: 'arraybuffer',
    });

    return Buffer.from(data as ArrayBuffer);
  }

  async fetchDocumentText(id: number): Promise<string> {
    const document = await this.client.documents.retrieve(id, {
      fields: ['content'],
    });

    return document.content ?? '';
  }
}
