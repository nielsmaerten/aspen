import { describe, expect, it } from 'vitest';

import {
  TitleResponseSchema,
  DateResponseSchema,
  CorrespondentResponseSchema,
  DoctypeResponseSchema,
} from '../../src/metadata/schemas.js';

describe('metadata response schemas', () => {
  it('normalizes loose title responses', () => {
    const result = TitleResponseSchema.parse({
      status: ' OK ',
      value: '   Monthly Statement   ',
      reason: 42,
      ignored: 'field',
    });

    expect(result).toEqual({
      status: 'ok',
      value: 'Monthly Statement',
      reason: '42',
    });
  });

  it('extracts ISO dates from varied formats', () => {
    const result = DateResponseSchema.parse({
      status: true,
      value: 'Due date: 2024/7/1',
      reason: '',
    });

    expect(result).toEqual({
      status: 'ok',
      value: '2024-07-01',
      reason: undefined,
    });
  });

  it('coerces correspondent payloads into structured entities', () => {
    const result = CorrespondentResponseSchema.parse({
      status: 'ok',
      value: {
        name: '  ACME Corp  ',
        create: 'yes',
        reason: 7,
      },
    });

    expect(result).toEqual({
      status: 'ok',
      value: {
        name: 'ACME Corp',
        create: true,
        reason: '7',
      },
      reason: undefined,
    });
  });

  it('accepts simple strings for entity selections', () => {
    const result = CorrespondentResponseSchema.parse({
      status: 'ok',
      value: '  ACME  ',
    });

    expect(result).toEqual({
      status: 'ok',
      value: {
        name: 'ACME',
        create: undefined,
        reason: undefined,
      },
      reason: undefined,
    });
  });

  it('treats missing entity names as validation failures', () => {
    expect(() =>
      DoctypeResponseSchema.parse({
        status: 'ok',
        value: {
          create: true,
        },
      }),
    ).toThrow(/name is required/);
  });

  it('allows unknown document types without values', () => {
    const result = DoctypeResponseSchema.parse({
      status: 0,
      value: null,
    });

    expect(result).toEqual({
      status: 'unknown',
      value: null,
      reason: undefined,
    });
  });
});
