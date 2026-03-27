import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import it from './locales/it.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import pt from './locales/pt.json'
import zh from './locales/zh.json'

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            it: { translation: it },
            es: { translation: es },
            fr: { translation: fr },
            de: { translation: de },
            pt: { translation: pt },
            zh: { translation: zh },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'mbif-language',
        },
    })

export default i18n
