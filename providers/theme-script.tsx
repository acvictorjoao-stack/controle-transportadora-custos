import {THEME_STORAGE_KEY} from '@/constants/app/theme';

/**
 * Script inline para evitar flash de tema incorreto no carregamento.
 * Deve ser renderizado antes da hidratação do React.
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
        var theme = localStorage.getItem(storageKey) || 'system';
        var resolved = theme;
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.classList.add(resolved);
        document.documentElement.style.colorScheme = resolved;
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{__html: script}} />;
}
