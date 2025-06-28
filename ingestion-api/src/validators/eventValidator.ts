import { Event, EventValidator as IEventValidator, ValidationResult } from '../types/Event';

export class EventValidator implements IEventValidator {
    validate(event: unknown): ValidationResult {
        const errors: string[] = [];

        if (!event || typeof event !== 'object') {
            errors.push('Event must be a valid object');
            return { isValid: false, errors };
        }

        const eventObj = event as Record<string, unknown>;

        if (!eventObj.source || typeof eventObj.source !== 'string') {
            errors.push('Event source is required and must be a string');
        }

        if (!eventObj.payload || typeof eventObj.payload !== 'object') {
            errors.push('Event payload is required and must be an object');
        }

        if (eventObj.timestamp && typeof eventObj.timestamp !== 'string') {
            errors.push('Event timestamp must be a string');
        }

        if (eventObj.id && typeof eventObj.id !== 'string') {
            errors.push('Event id must be a string');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateAndTransform(event: unknown): { isValid: boolean; event?: Event; errors: string[] } {
        const validation = this.validate(event);

        if (!validation.isValid) {
            return { isValid: false, errors: validation.errors };
        }

        const eventObj = event as Record<string, unknown>;
        const transformedEvent: Event = {
            source: eventObj.source as string,
            payload: eventObj.payload as Record<string, unknown>,
            timestamp: eventObj.timestamp as string,
            id: eventObj.id as string
        };

        return { isValid: true, event: transformedEvent, errors: [] };
    }
}
