(() => {
  'use strict';
  const allowedTags = new Set(['P', 'BR', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG']);
  const allowedAttrs = new Set(['href', 'title', 'target', 'rel', 'alt', 'data-image-id', 'src']);
  const safeProtocols = new Set(['http:', 'https:', 'mailto:']);

  function safeUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return safeProtocols.has(url.protocol) ? url.href : '';
    } catch (error) { return ''; }
  }

  function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const clean = document.createDocumentFragment();
    const visit = (node, parent) => {
      if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const name = node.tagName.toUpperCase();
      if (!allowedTags.has(name)) {
        [...node.childNodes].forEach(child => visit(child, parent));
        return;
      }
      const next = document.createElement(name.toLowerCase());
      [...node.attributes].forEach(attr => {
        const attrName = attr.name.toLowerCase();
        if (!allowedAttrs.has(attrName) || attrName.startsWith('on') || attrName === 'src' || attrName === 'href') return;
        next.setAttribute(attrName, attr.value);
      });
      if (name === 'A') {
        const href = safeUrl(node.getAttribute('href') || '');
        if (!href) return [...node.childNodes].forEach(child => visit(child, parent));
        next.setAttribute('href', href); next.setAttribute('target', '_blank'); next.setAttribute('rel', 'noopener noreferrer');
      }
      if (name === 'IMG') {
        const id = node.getAttribute('data-image-id');
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return;
        next.setAttribute('data-image-id', id);
        next.setAttribute('alt', node.getAttribute('alt') || '');
        next.setAttribute('loading', 'lazy');
      }
      [...node.childNodes].forEach(child => visit(child, next));
      parent.appendChild(next);
    };
    [...template.content.childNodes].forEach(node => visit(node, clean));
    const holder = document.createElement('div'); holder.appendChild(clean); return holder.innerHTML;
  }

  function plainText(html) { const holder = document.createElement('div'); holder.innerHTML = sanitize(html); return holder.textContent.replace(/\s+/g, ' ').trim(); }
  window.BrainSanitize = { sanitize, plainText };
})();
