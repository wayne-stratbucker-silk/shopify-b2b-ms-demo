import type { Locale } from "./config";

// UI-chrome message catalog. Scoped to storefront chrome for the demo — extend
// as more strings are localized. Keys are dotted for readability.
export type MessageKey =
  | "footer.newsletterTitle"
  | "footer.newsletterBlurb"
  | "footer.workEmail"
  | "footer.subscribe"
  | "footer.subscribing"
  | "footer.thanks"
  | "footer.language"
  | "common.viewAll"
  | "common.needHelp"
  | "nav.resources";

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en: {
    "footer.newsletterTitle": "Trade updates",
    "footer.newsletterBlurb": "Product drops, pricing changes and how-tos for pros.",
    "footer.workEmail": "Work email",
    "footer.subscribe": "Subscribe",
    "footer.subscribing": "Subscribing…",
    "footer.thanks": "Thanks — confirmation sent to",
    "footer.language": "Language",
    "common.viewAll": "View all",
    "common.needHelp": "Need help?",
    "nav.resources": "Resources & News",
  },
  es: {
    "footer.newsletterTitle": "Novedades para el sector",
    "footer.newsletterBlurb": "Nuevos productos, cambios de precio y guías para profesionales.",
    "footer.workEmail": "Correo de trabajo",
    "footer.subscribe": "Suscribirse",
    "footer.subscribing": "Suscribiendo…",
    "footer.thanks": "Gracias — confirmación enviada a",
    "footer.language": "Idioma",
    "common.viewAll": "Ver todo",
    "common.needHelp": "¿Necesita ayuda?",
    "nav.resources": "Recursos y Noticias",
  },
};
