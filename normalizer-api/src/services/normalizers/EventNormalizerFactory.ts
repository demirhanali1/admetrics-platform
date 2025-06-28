import { EventNormalizerFactory, EventNormalizer } from '../../types/Event';
import { GoogleNormalizer } from './GoogleNormalizer';
import { MetaNormalizer } from './MetaNormalizer';

export class NormalizerFactory implements EventNormalizerFactory {
  createNormalizer(source: string): EventNormalizer {
    switch (source.toLowerCase()) {
      case 'google':
        return new GoogleNormalizer();
      case 'meta':
        return new MetaNormalizer();
      default:
        throw new Error(`Unsupported source platform: ${source}`);
    }
  }
} 