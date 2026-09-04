(() => {
  'use strict';

  const documentsKey = 'hakes-brain.local-documents';
  const imagesKey = 'hakes-brain.local-images';
  const viewsKey = 'hakes-brain.local-views';
  const demoDocs = [
    { id: 'seed-welcome', title: 'Welcome to the library', description: 'A small introduction to this personal publishing desk and the pages that live here.', category: 'Personal', tags: ['welcome', 'about'], body_html: '<p>This is a quiet place for the things I am making, learning, remembering, and becoming.</p><h2>How this works</h2><p>Sign in with a temporary local account to explore the library. The first account created on this browser can edit its pages.</p><blockquote>Keep what matters. Make room for what comes next.</blockquote>', is_published: true, created_at: '2024-02-18T12:00:00Z', updated_at: '2024-02-18T12:00:00Z', is_demo: false },
    { id: 'seed-making', title: 'A note on making things', description: 'A short essay about starting before the shape of an idea is completely clear.', category: 'Essays', tags: ['process', 'ideas'], body_html: '<p>Most good things begin as an arrangement of small questions. What if? Why not? What would happen if I gave this one afternoon?</p><p>Making is not a straight line. It is a practice of noticing, returning, and leaving a little evidence behind.</p><h2>Start with the next honest step</h2><p>The next step does not need to be impressive. It only needs to be real enough to move the work forward.</p>', is_published: true, created_at: '2024-01-26T12:00:00Z', updated_at: '2024-02-04T12:00:00Z', is_demo: false },
    { id: 'seed-scratchpad', title: 'Project scratchpad', description: 'Loose notes, open questions, and a few useful directions for the road ahead.', category: 'Projects', tags: ['work', 'draft'], body_html: '<p>Collect the fragments before asking them to become a plan.</p><ul><li>Choose the smallest useful version.</li><li>Leave space for surprise.</li><li>Return tomorrow with fresh eyes.</li></ul>', is_published: true, created_at: '2024-01-08T12:00:00Z', updated_at: '2024-01-12T12:00:00Z', is_demo: false }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value === null ? fallback : value; } catch (error) { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const localDocuments = () => { const value = read(documentsKey, null); if (Array.isArray(value)) return value; const initial = clone(demoDocs); write(documentsKey, initial); return initial; };
  const localImages = () => { const value = read(imagesKey, []); return Array.isArray(value) ? value : []; };
  const currentUser = () => window.BrainAuth.session?.user || null;
  const requireOwner = () => { const user = currentUser(); if (!user || user.role !== 'owner') throw new Error('Only the local owner account can change documents.'); return user; };
  const requireSession = () => { const user = currentUser(); if (!user) throw new Error('Sign in before doing that.'); return user; };
  const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `page-${Date.now()}`;
  const cleanTags = value => (Array.isArray(value) ? value : String(value || '').split(',')).map(tag => tag.trim().toLowerCase()).filter(Boolean).filter((tag, index, list) => list.indexOf(tag) === index).slice(0, 12);
  const localId = prefix => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const dimensionsFor = file => new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be read.')); }; image.src = url; });
  const fileAsDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('This image could not be stored locally.')); reader.readAsDataURL(file); });

  async function listDocuments() {
    requireSession();
    const docs = localDocuments();
    return clone(currentUser().role === 'owner' ? docs : docs.filter(doc => doc.is_published));
  }
  async function getDocument(id) {
    requireSession();
    const doc = localDocuments().find(item => item.id === id);
    if (!doc || (currentUser().role !== 'owner' && !doc.is_published)) return null;
    return clone(doc);
  }
  async function claimOwner() { return currentUser()?.role === 'owner'; }
  async function isOwner() { return currentUser()?.role === 'owner'; }
  async function saveDocument(input) {
    const owner = requireOwner();
    const title = String(input.title || '').trim();
    if (!title) throw new Error('Give your document a title first.');
    const docs = localDocuments();
    const now = new Date().toISOString();
    const existing = input.id && docs.find(doc => doc.id === input.id);
    const payload = { title, slug: slugify(title), description: String(input.description || '').trim().slice(0, 240), category: String(input.category || 'Notes').trim() || 'Notes', tags: cleanTags(input.tags), body_html: window.BrainSanitize.sanitize(input.bodyHtml), is_published: Boolean(input.isPublished), owner_id: owner.id, created_at: existing?.created_at || now, updated_at: now, is_demo: false };
    const document = existing ? { ...existing, ...payload } : { id: localId('doc'), ...payload };
    const next = existing ? docs.map(doc => doc.id === document.id ? document : doc) : [document, ...docs];
    try { write(documentsKey, next); } catch (error) { throw new Error('This browser could not save the document. Try a shorter document.'); }
    return clone(document);
  }
  async function uploadImage(file, documentId, altText) {
    const owner = requireOwner();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose a JPEG, PNG, or WebP image.');
    if (file.size > 2 * 1024 * 1024) throw new Error('Temporary local images must be smaller than 2 MB.');
    const dimensions = await dimensionsFor(file);
    if (Math.max(dimensions.width, dimensions.height) > 2400) throw new Error('Please choose an image no larger than 2400px on its longest edge.');
    const id = localId('image');
    const record = { id, document_id: documentId, owner_id: owner.id, file_name: file.name, mime_type: file.type, alt_text: String(altText || '').trim().slice(0, 180), width: dimensions.width, height: dimensions.height, url: await fileAsDataUrl(file), created_at: new Date().toISOString() };
    try { write(imagesKey, [...localImages(), record]); } catch (error) { throw new Error('This browser ran out of local storage for that image.'); }
    return clone(record);
  }
  async function listImages(documentId) { requireSession(); return clone(localImages().filter(image => image.document_id === documentId)); }
  async function deleteDocument(id) {
    requireOwner();
    write(documentsKey, localDocuments().filter(doc => doc.id !== id));
    write(imagesKey, localImages().filter(image => image.document_id !== id));
  }
  async function deleteImage(image) { requireOwner(); write(imagesKey, localImages().filter(item => item.id !== image.id)); }
  async function recordDocumentView(documentId) {
    const user = requireSession();
    const document = localDocuments().find(item => item.id === documentId);
    if (!document || (!document.is_published && user.role !== 'owner')) return null;
    const event = { id: localId('view'), document_id: document.id, document_title: document.title, viewer_id: user.id, viewer_username: user.username, viewer_description: user.description, viewed_at: new Date().toISOString() };
    const events = read(viewsKey, []);
    write(viewsKey, [event, ...(Array.isArray(events) ? events : [])].slice(0, 5000));
    return clone(event);
  }
  async function listViewEvents() { requireOwner(); const events = read(viewsKey, []); return clone((Array.isArray(events) ? events : []).sort((a, b) => new Date(b.viewed_at) - new Date(a.viewed_at))); }
  async function clearViewEvents() { requireOwner(); localStorage.removeItem(viewsKey); }
  window.BrainData = { demoDocs, cleanTags, listDocuments, getDocument, saveDocument, uploadImage, listImages, deleteDocument, deleteImage, claimOwner, isOwner, recordDocumentView, listViewEvents, clearViewEvents, localMode: true };
})();
