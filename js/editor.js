(() => {
  'use strict';
  const refs = {};
  let activeId = null;
  let dirty = false;
  let pendingFiles = [];
  let closeCallback = null;
  function init(elements, callbacks) { Object.assign(refs, elements); closeCallback = callbacks.close; refs.body.addEventListener('input', () => { dirty = true; refs.state.textContent = 'Unsaved changes'; }); refs.form.addEventListener('submit', event => { event.preventDefault(); callbacks.save(read()); }); refs.body.addEventListener('paste', event => { event.preventDefault(); const text = event.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); dirty = true; }); refs.form.addEventListener('click', event => { const commandButton = event.target.closest('[data-editor-command]'); if (commandButton) { event.preventDefault(); refs.body.focus(); document.execCommand(commandButton.dataset.editorCommand, false, commandButton.dataset.editorValue || null); dirty = true; } }); refs.dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }); }
  function read() { return { id: activeId, title: refs.title.value, description: refs.description.value, category: refs.category.value, tags: refs.tags.value, isPublished: refs.published.checked, bodyHtml: window.BrainSanitize.sanitize(refs.body.innerHTML), pendingFiles: pendingFiles.slice() }; }
  function open(doc) { activeId = doc ? doc.id : null; pendingFiles = []; dirty = false; refs.heading.textContent = doc ? 'Edit document' : 'New document'; refs.state.textContent = doc ? 'Saved' : 'Draft'; refs.title.value = doc?.title || ''; refs.description.value = doc?.description || ''; refs.category.value = doc?.category || 'Notes'; refs.tags.value = Array.isArray(doc?.tags) ? doc.tags.join(', ') : ''; refs.published.checked = Boolean(doc?.is_published); refs.body.innerHTML = window.BrainSanitize.sanitize(doc?.body_html || ''); refs.message.textContent = ''; refs.dialog.showModal(); refs.title.focus(); document.body.classList.add('modal-open'); }
  function close(force = false) { if (!force && dirty && !window.confirm('You have unsaved changes. Close without saving?')) return false; if (refs.dialog.open) refs.dialog.close(); pendingFiles.forEach(file => URL.revokeObjectURL(file.url)); pendingFiles = []; document.body.classList.remove('modal-open'); if (closeCallback) closeCallback(); return true; }
  function markSaved() { dirty = false; refs.state.textContent = 'Saved just now'; }
  function setMessage(text) { refs.message.textContent = text || ''; }
  function setSaving(value) { refs.state.textContent = value ? 'Saving…' : 'Saved'; }
  function setId(id) { activeId = id; }
  function replacePending(id, image) { const element = [...refs.body.querySelectorAll('img[data-image-id]')].find(item => item.dataset.imageId === id); if (element) { element.dataset.imageId = image.id; element.src = image.url; element.alt = image.alt_text; } const pending = pendingFiles.find(file => file.id === id); if (pending) URL.revokeObjectURL(pending.url); pendingFiles = pendingFiles.filter(file => file.id !== id); }
  function addPending(file, altText) { const id = `pending-${crypto.randomUUID()}`; const url = URL.createObjectURL(file); pendingFiles.push({ id, file, altText, url }); const image = document.createElement('img'); image.src = url; image.alt = altText; image.dataset.imageId = id; refs.body.appendChild(image); dirty = true; refs.state.textContent = 'Unsaved changes'; }
  window.BrainEditor = { init, open, close, read, markSaved, setMessage, setSaving, setId, replacePending, addPending, getPending: () => pendingFiles.slice(), get dirty() { return dirty; } };
})();
