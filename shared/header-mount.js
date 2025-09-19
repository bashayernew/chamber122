async function mountHeader() {
  const slot = document.getElementById('siteHeader');
  if (!slot) return console.error('header-mount: #siteHeader not found');

  async function getPartial() {
    try { return await (await fetch('/partials/header.html', { cache:'no-cache' })).text(); }
    catch { return await (await fetch('./partials/header.html', { cache:'no-cache' })).text(); }
  }

  try {
    slot.innerHTML = await getPartial();

    const toggle = document.getElementById('navToggle');
    const nav = document.querySelector('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.style.display === 'flex';
        nav.style.display = open ? 'none' : 'flex';
        toggle.setAttribute('aria-expanded', String(!open));
      });
    }

    try { await import('/shared/header-menu.js'); }
    catch { await import('./header-menu.js'); }
  } catch (e) {
    console.error('header-mount error', e);
  }
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', mountHeader)
  : mountHeader();