import type { MetadataStrategy } from '../../domain/metadata.js';
import type { MetadataExtractionContext } from '../context.js';
import type { EntitySelection } from '../../domain/metadata.js';
import { TitleStrategy } from './title.js';
import { DateStrategy } from './date.js';
import { CorrespondentStrategy } from './correspondent.js';
import { DoctypeStrategy } from './doctype.js';

export type AspenStrategy =
  | MetadataStrategy<'title', string, MetadataExtractionContext>
  | MetadataStrategy<'date', string, MetadataExtractionContext>
  | MetadataStrategy<'correspondent', EntitySelection, MetadataExtractionContext>
  | MetadataStrategy<'doctype', EntitySelection, MetadataExtractionContext>;

export function createMetadataStrategies(): AspenStrategy[] {
  return [
    new TitleStrategy(),
    new CorrespondentStrategy(),
    new DateStrategy(),
    new DoctypeStrategy(),
  ];
}
