/**
 * 🔍 Runtime Overflow Detection Script
 *
 * Este script se ejecuta en el navegador y detecta elementos con overflow real.
 * Pegar en la consola del navegador para detectar problemas de overflow.
 *
 * Uso:
 * 1. Abrir DevTools (F12)
 * 2. Ir a Console
 * 3. Pegar este script
 * 4. Ver resultados
 */

(function detectOverflow() {
  const results = {
    critical: [],
    warning: [],
    info: []
  };

  // Colores para console
  const styles = {
    critical: 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px;',
    warning: 'background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px;',
    info: 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;',
    success: 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px;'
  };

  console.clear();
  console.log('%c🔍 OVERFLOW DETECTION STARTED', 'font-size: 16px; font-weight: bold;');
  console.log('─'.repeat(50));

  // 1. Detectar elementos con contenido que desborda
  document.querySelectorAll('*').forEach(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);

    // Skip elementos invisibles
    if (rect.width === 0 || rect.height === 0) return;
    if (style.display === 'none' || style.visibility === 'hidden') return;

    // Detectar overflow vertical
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflow = el.scrollHeight - el.clientHeight;
      const hasOverflowHidden = style.overflow === 'hidden' ||
                                style.overflowY === 'hidden';

      if (!hasOverflowHidden && overflow > 5) {
        results.warning.push({
          element: el,
          type: 'vertical-overflow',
          overflow: overflow,
          selector: getSelector(el),
          message: `Contenido desborda ${overflow}px verticalmente`
        });
      }
    }

    // Detectar hijos que desbordan el padre
    Array.from(el.children).forEach(child => {
      const childRect = child.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();

      // Overflow vertical (hijo sale por abajo)
      if (childRect.bottom > parentRect.bottom + 1) {
        const overflow = Math.round(childRect.bottom - parentRect.bottom);
        if (overflow > 2) {
          results.critical.push({
            element: child,
            parent: el,
            type: 'child-overflow-bottom',
            overflow: overflow,
            selector: getSelector(child),
            parentSelector: getSelector(el),
            message: `Hijo desborda ${overflow}px por debajo del padre`
          });
        }
      }

      // Overflow horizontal (hijo sale por derecha)
      if (childRect.right > parentRect.right + 1) {
        const overflow = Math.round(childRect.right - parentRect.right);
        if (overflow > 2) {
          results.warning.push({
            element: child,
            parent: el,
            type: 'child-overflow-right',
            overflow: overflow,
            selector: getSelector(child),
            message: `Hijo desborda ${overflow}px por la derecha`
          });
        }
      }
    });
  });

  // 2. Detectar cards/tarjetas con problemas específicos
  document.querySelectorAll('[class*="card"], [class*="Card"], a[class*="rounded"]').forEach(card => {
    const cardRect = card.getBoundingClientRect();

    // Buscar CTAs o botones dentro
    const ctas = card.querySelectorAll('button, [class*="btn"], [class*="cta"], a[class*="bg-"]');
    ctas.forEach(cta => {
      const ctaRect = cta.getBoundingClientRect();
      if (ctaRect.bottom > cardRect.bottom) {
        results.critical.push({
          element: cta,
          parent: card,
          type: 'cta-overflow',
          overflow: Math.round(ctaRect.bottom - cardRect.bottom),
          selector: getSelector(cta),
          message: 'CTA/Botón cortado o invisible por overflow'
        });
      }
    });

    // Buscar precios
    const prices = card.querySelectorAll('[class*="price"], [class*="Price"], span:has(+ span)');
    prices.forEach(price => {
      if (price.textContent?.includes('$')) {
        const priceRect = price.getBoundingClientRect();
        if (priceRect.bottom > cardRect.bottom) {
          results.critical.push({
            element: price,
            parent: card,
            type: 'price-overflow',
            overflow: Math.round(priceRect.bottom - cardRect.bottom),
            selector: getSelector(price),
            message: 'Precio cortado o invisible'
          });
        }
      }
    });
  });

  // 3. Detectar elementos con text-overflow sin ellipsis visible
  document.querySelectorAll('[class*="truncate"], [class*="line-clamp"]').forEach(el => {
    if (el.scrollWidth > el.clientWidth) {
      results.info.push({
        element: el,
        type: 'text-truncated',
        selector: getSelector(el),
        message: 'Texto truncado (puede ser intencional)'
      });
    }
  });

  // Generar selector CSS único
  function getSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ')
        .filter(c => c && !c.includes('[') && !c.includes(':'))
        .slice(0, 3)
        .join('.');
      if (classes) {
        const tag = el.tagName.toLowerCase();
        return `${tag}.${classes}`;
      }
    }
    return el.tagName.toLowerCase();
  }

  // Imprimir resultados
  console.log('\n');

  if (results.critical.length > 0) {
    console.log(`%c🔴 CRÍTICOS (${results.critical.length})`, styles.critical);
    results.critical.forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${issue.message}`);
      console.log(`     Selector: ${issue.selector}`);
      console.log(`     Overflow: ${issue.overflow}px`);
      console.log('     Elemento:', issue.element);
    });
  }

  if (results.warning.length > 0) {
    console.log(`\n%c🟡 WARNINGS (${results.warning.length})`, styles.warning);
    results.warning.slice(0, 10).forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.message} - ${issue.selector}`);
    });
    if (results.warning.length > 10) {
      console.log(`  ... y ${results.warning.length - 10} más`);
    }
  }

  if (results.info.length > 0) {
    console.log(`\n%c🔵 INFO (${results.info.length})`, styles.info);
    console.log('  Elementos con texto truncado (generalmente intencional)');
  }

  // Resumen
  console.log('\n' + '═'.repeat(50));
  console.log('%c📊 RESUMEN', 'font-weight: bold;');
  console.log(`   Críticos: ${results.critical.length}`);
  console.log(`   Warnings: ${results.warning.length}`);
  console.log(`   Info: ${results.info.length}`);

  if (results.critical.length === 0 && results.warning.length === 0) {
    console.log(`\n%c✅ No se detectaron problemas de overflow`, styles.success);
  }

  // Highlight visual de elementos problemáticos
  if (results.critical.length > 0) {
    console.log('\n💡 Los elementos críticos se resaltarán en rojo por 5 segundos...');
    results.critical.forEach(issue => {
      issue.element.style.outline = '3px solid red';
      issue.element.style.outlineOffset = '2px';
    });

    setTimeout(() => {
      results.critical.forEach(issue => {
        issue.element.style.outline = '';
        issue.element.style.outlineOffset = '';
      });
    }, 5000);
  }

  // Retornar resultados para uso programático
  return results;
})();
