import type { Page } from "@playwright/test";

/**
 * Auto-dismiss vite error overlays if they appear.
 * Prevents Nitro dev server race conditions from blocking E2E tests.
 * Only relevant when reusing a dev server (production builds have no overlay).
 *
 * Handles two overlay types:
 * - vite-error-overlay (Vite's built-in) — pre-register custom element + CSS + observer
 * - vite-plugin-checker-error-overlay (checker plugin) — CSS + observer only
 *   (NOT pre-registered because the checker plugin doesn't guard against duplicate definitions)
 */
export async function dismissViteOverlay(page: Page) {
	await page.addInitScript(`
(function() {
	var CSS_ID = '__vite_overlay_kill';
	var SELECTOR = 'vite-error-overlay,vite-plugin-checker-error-overlay';
	var CSS = SELECTOR + '{display:none!important;pointer-events:none!important;opacity:0!important;width:0!important;height:0!important;position:fixed!important;left:-9999px!important;top:-9999px!important;z-index:-1!important;overflow:hidden!important}';

	function ensureCSS() {
		if (document.getElementById(CSS_ID)) return;
		var s = document.createElement('style');
		s.id = CSS_ID;
		s.textContent = CSS;
		(document.head || document.documentElement).appendChild(s);
	}

	function hideEl(el) {
		el.style.setProperty('display', 'none', 'important');
		el.style.setProperty('pointer-events', 'none', 'important');
		el.style.setProperty('opacity', '0', 'important');
		el.style.setProperty('width', '0', 'important');
		el.style.setProperty('height', '0', 'important');
		el.style.setProperty('position', 'fixed', 'important');
		el.style.setProperty('left', '-9999px', 'important');
		el.style.setProperty('top', '-9999px', 'important');
		el.style.setProperty('z-index', '-1', 'important');
		el.style.setProperty('overflow', 'hidden', 'important');
	}

	function sweep() {
		ensureCSS();
		document.querySelectorAll(SELECTOR).forEach(hideEl);
	}

	/* Pre-register vite-error-overlay only (Vite guards against duplicate defs).
	   Do NOT pre-register vite-plugin-checker-error-overlay — the checker plugin
	   does not guard and throws DOMException if the element is already defined. */
	try {
		if (!customElements.get('vite-error-overlay')) {
			customElements.define('vite-error-overlay', class extends HTMLElement {
				connectedCallback() { hideEl(this); }
			});
		}
	} catch(e) { /* already defined */ }

	ensureCSS();

	new MutationObserver(sweep).observe(
		document.documentElement,
		{ childList: true, subtree: true }
	);

	setInterval(sweep, 200);
})();
	`);
}
