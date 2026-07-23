'use client';

import * as React from 'react';

/**
 * Rola suavemente até o hash da URL ao montar e em mudanças de hash.
 */
function DashboardHashScroll() {
  React.useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      // Aguarda layout (conteúdo server-rendered)
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
      });
    }

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return null;
}

export {DashboardHashScroll};
