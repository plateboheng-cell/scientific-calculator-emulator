const firstLocale = locales => (Array.isArray(locales) ? locales : [locales])
  .find(locale => typeof locale === 'string' && locale.trim());

// Respect the first preferred UI language, not the OS region/date format.
export function resolveLanguage(locales) {
  const locale = firstLocale(locales)?.trim().replaceAll('_', '-').toLowerCase();
  return locale && /^zh(?:-[a-z0-9]{1,8})*$/.test(locale) ? 'zh' : 'en';
}

export function resolveLanguagePreference(savedLanguage, fallback = 'en') {
  return ['zh', 'en'].includes(savedLanguage) ? savedLanguage : fallback === 'zh' ? 'zh' : 'en';
}

export function detectSystemLanguage(environment = globalThis) {
  const read = getter => {try {return getter();} catch {return undefined;}};
  for (const locales of [
    read(() => environment?.cnxSystem?.languages),
    read(() => environment?.navigator?.languages),
    read(() => environment?.navigator?.language),
  ]) {
    if (firstLocale(locales)) return resolveLanguage(locales);
  }
  return 'en';
}
