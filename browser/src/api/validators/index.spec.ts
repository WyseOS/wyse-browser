/// <reference types="jest" />

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
    IsValidNameConstraint,
    IsValidSessionIdConstraint,
    IsValidFlowInstanceIdConstraint,
    IsValidExtensionNamesConstraint
} from './index';
import { MetadataType } from '../../constants';

describe('Validators', () => {
    describe('IsValidNameConstraint', () => {
        let validator: IsValidNameConstraint;

        beforeEach(() => {
            validator = new IsValidNameConstraint();
        });

        describe('Flow name validation', () => {
            it('should accept valid flow names', () => {
                const validNames = ['test', 'valid_flow', 'flow-name', 'FlowName123'];

                validNames.forEach(name => {
                    const result = validator.validate(name, {
                        constraints: [MetadataType.FLOW]
                    } as any);
                    expect(result).toBe(true);
                });
            });

            it('should reject flow names that are too short', () => {
                const shortNames = ['', 'a', 'ab', 'abc'];

                shortNames.forEach(name => {
                    const result = validator.validate(name, {
                        constraints: [MetadataType.FLOW]
                    } as any);
                    expect(result).toBe(false);
                });
            });

            it('should reject flow names that are too long', () => {
                const longName = 'a'.repeat(65); // Exceeds MaxFlowNameLength
                const result = validator.validate(longName, {
                    constraints: [MetadataType.FLOW]
                } as any);
                expect(result).toBe(false);
            });

            it('should reject null or non-string values', () => {
                const invalidValues = [null, undefined, 123, {}, []];

                invalidValues.forEach(value => {
                    const result = validator.validate(value as any, {
                        constraints: [MetadataType.FLOW]
                    } as any);
                    expect(result).toBe(false);
                });
            });
        });

        describe('Worklet name validation', () => {
            it('should accept valid worklet names', () => {
                const validNames = ['test', 'valid_worklet', 'worklet-name'];

                validNames.forEach(name => {
                    const result = validator.validate(name, {
                        constraints: [MetadataType.WORKLET]
                    } as any);
                    expect(result).toBe(true);
                });
            });

            it('should reject worklet names that are too long', () => {
                const longName = 'a'.repeat(33); // Exceeds MaxWorkletNameLength
                const result = validator.validate(longName, {
                    constraints: [MetadataType.WORKLET]
                } as any);
                expect(result).toBe(false);
            });
        });
    });

    describe('IsValidSessionIdConstraint', () => {
        let validator: IsValidSessionIdConstraint;

        beforeEach(() => {
            validator = new IsValidSessionIdConstraint();
        });

        it('should accept valid UUID v4', () => {
            const validUUIDs = [
                '550e8400-e29b-41d4-a716-446655440000',
                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                '6ba7b814-9dad-41d1-80b4-00c04fd430c8'
            ];

            validUUIDs.forEach(uuid => {
                const result = validator.validate(uuid);
                expect(result).toBe(true);
            });
        });

        it('should accept empty string (optional field)', () => {
            const result = validator.validate('');
            expect(result).toBe(true);
        });

        it('should accept null/undefined (optional field)', () => {
            expect(validator.validate(null as any)).toBe(true);
            expect(validator.validate(undefined as any)).toBe(true);
        });

        it('should reject invalid UUID formats', () => {
            const invalidUUIDs = [
                'not-a-uuid',
                '550e8400-e29b-41d4-a716',
                '550e8400-e29b-41d4-a716-446655440000-extra',
                '550e8400-e29b-51d4-a716-446655440000', // Wrong version
                'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz'
            ];

            invalidUUIDs.forEach(uuid => {
                const result = validator.validate(uuid);
                expect(result).toBe(false);
            });
        });
    });

    describe('IsValidFlowInstanceIdConstraint', () => {
        let validator: IsValidFlowInstanceIdConstraint;

        beforeEach(() => {
            validator = new IsValidFlowInstanceIdConstraint();
        });

        it('should accept non-empty strings', () => {
            const validIds = ['flow-123', 'abc', 'flow_instance_id_123'];

            validIds.forEach(id => {
                const result = validator.validate(id);
                expect(result).toBe(true);
            });
        });

        it('should reject empty strings', () => {
            const invalidIds = ['', '   ', '\t', '\n'];

            invalidIds.forEach(id => {
                const result = validator.validate(id);
                expect(result).toBe(false);
            });
        });

        it('should reject null/undefined values', () => {
            expect(validator.validate(null as any)).toBe(false);
            expect(validator.validate(undefined as any)).toBe(false);
        });

        it('should reject non-string values', () => {
            const invalidValues = [123, {}, [], true];

            invalidValues.forEach(value => {
                const result = validator.validate(value as any);
                expect(result).toBe(false);
            });
        });
    });

    describe('IsValidExtensionNamesConstraint', () => {
        let validator: IsValidExtensionNamesConstraint;

        beforeEach(() => {
            validator = new IsValidExtensionNamesConstraint();
        });

        it('should accept valid extension names array', () => {
            const validArrays = [
                ['metamask', 'extension2'],
                ['single-extension'],
                ['ext_1', 'ext-2', 'Extension3']
            ];

            validArrays.forEach(array => {
                const result = validator.validate(array);
                expect(result).toBe(true);
            });
        });

        it('should accept empty array', () => {
            const result = validator.validate([]);
            expect(result).toBe(true);
        });

        it('should accept null/undefined (optional field)', () => {
            expect(validator.validate(null as any)).toBe(true);
            expect(validator.validate(undefined as any)).toBe(true);
        });

        it('should reject non-array values', () => {
            const invalidValues = ['not-array', 123, {}, true];

            invalidValues.forEach(value => {
                const result = validator.validate(value as any);
                expect(result).toBe(false);
            });
        });

        it('should reject arrays with empty string elements', () => {
            const invalidArrays = [
                ['valid', ''],
                ['', 'valid'],
                ['   ', 'valid'],
                ['\t', 'valid']
            ];

            invalidArrays.forEach(array => {
                const result = validator.validate(array);
                expect(result).toBe(false);
            });
        });

        it('should reject arrays with non-string elements', () => {
            const invalidArrays = [
                ['valid', 123],
                [null, 'valid'],
                ['valid', {}],
                [[], 'valid']
            ];

            invalidArrays.forEach(array => {
                const result = validator.validate(array as any);
                expect(result).toBe(false);
            });
        });
    });
}); 