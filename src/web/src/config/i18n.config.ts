import i18next from 'i18next';
import i18nextHttpBackend from 'i18next-http-backend'; // v2.0.0
import i18nextBrowserLanguageDetector from 'i18next-browser-languagedetector'; // v7.0.0

// Import default translations for static loading
import enCommon from '../locales/en/common.json';
import heCommon from '../locales/he/common.json';

// Constants for i18n configuration
export const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'pt'] as const;
export const RTL_LANGUAGES = ['he', 'ar'] as const;
export const DEFAULT_NAMESPACE = 'common';
export const FALLBACK_LANGUAGE = 'en';
export const TRANSLATION_LOAD_TIMEOUT = 5000;
export const RETRY_ATTEMPTS = 3;

// Type definitions
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
type Direction = 'ltr' | 'rtl';

// i18n configuration object
export const i18nConfig = {
  supportedLngs: SUPPORTED_LANGUAGES,
  fallbackLng: FALLBACK_LANGUAGE,
  defaultNS: DEFAULT_NAMESPACE,
  
  // Pre-load default translations
  resources: {
    en: {
      [DEFAULT_NAMESPACE]: enCommon
    },
    he: {
      [DEFAULT_NAMESPACE]: heCommon
    }
  },

  // Backend configuration for loading translations
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    timeout: TRANSLATION_LOAD_TIMEOUT,
    retries: RETRY_ATTEMPTS,
    queryStringParams: { v: process.env.REACT_APP_VERSION || '1.0.0' },
    allowMultiLoading: true,
    cache: ['localStorage'],
  },

  // Language detection configuration
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    lookupLocalStorage: 'i18nextLng',
    checkWhitelist: true
  },

  // React specific configuration
  react: {
    useSuspense: true,
    bindI18n: 'languageChanged loaded',
    bindStore: 'added removed',
    nsMode: 'default',
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
  },

  // General configuration
  interpolation: {
    escapeValue: false,
    format: (value: any, format: string, lng: string) => {
      if (format === 'uppercase') return value.toUpperCase();
      if (format === 'lowercase') return value.toLowerCase();
      return value;
    }
  },

  // Performance optimization
  load: 'languageOnly',
  preload: [FALLBACK_LANGUAGE],
  keySeparator: '.',
  nsSeparator: ':',
  pluralSeparator: '_',
  contextSeparator: '_',
};

/**
 * Determines text direction based on language code
 * @param languageCode - The language code to check
 * @returns 'rtl' or 'ltr' based on language
 */
export const getLanguageDirection = (languageCode: SupportedLanguage): Direction => {
  return RTL_LANGUAGES.includes(languageCode as typeof RTL_LANGUAGES[number]) ? 'rtl' : 'ltr';
};

/**
 * Initializes i18next with all required configurations and plugins
 * @returns Promise<typeof i18next> - Initialized i18next instance
 */
export const initializeI18n = async (): Promise<typeof i18next> => {
  try {
    await i18next
      .use(i18nextHttpBackend)
      .use(i18nextBrowserLanguageDetector)
      .init({
        ...i18nConfig,
        fallbackLng: {
          'he-IL': ['he', 'en'],
          'ar-*': ['ar', 'en'],
          'default': [FALLBACK_LANGUAGE]
        },
      });

    // Set up language change handlers
    i18next.on('languageChanged', (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = getLanguageDirection(lng as SupportedLanguage);
    });

    // Set up error handlers
    i18next.on('failedLoading', (lng: string, ns: string, msg: string) => {
      console.error(`Failed loading translation: ${lng}/${ns}`, msg);
    });

    i18next.on('missingKey', (lngs: string[], namespace: string, key: string) => {
      console.warn(`Missing translation key: ${namespace}:${key} for languages:`, lngs);
    });

    return i18next;
  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw error;
  }
};

export default i18next;