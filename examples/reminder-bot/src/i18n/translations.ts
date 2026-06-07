import type { Translations } from 'nestgram';

import { en } from './en';
import { uk } from './uk';

export const DEFAULT_LOCALE = 'en';

export const translations: Translations = { en, uk };
