/* Vyhľadávanie vo verejnom archíve odrôd. Bez JS zostávajú všetky odkazy prístupné. */
(() => {
  const search = document.getElementById('profile-search');
  const section = document.getElementById('profile-section');
  const reset = document.getElementById('profile-reset');
  const count = document.getElementById('profile-count');
  const empty = document.getElementById('profile-empty');
  const form = document.getElementById('profile-filters');
  const list = document.getElementById('profile-list');
  if (!search || !section || !reset || !count || !empty || !form || !list) return;

  const fold = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .toLocaleLowerCase('sk')
    .trim();

  const cards = [...list.querySelectorAll('.profile-card')].map(element => ({
    element,
    name: fold(element.querySelector('strong')?.textContent),
    section: element.dataset.section || ''
  }));

  const update = () => {
    const query = fold(search.value);
    const group = section.value;
    let found = 0;
    for (const card of cards) {
      const visible = (!query || card.name.includes(query)) && (!group || card.section === group);
      card.element.hidden = !visible;
      if (visible) found++;
    }
    count.textContent = found === 1 ? '1 odroda' :
      found >= 2 && found <= 4 ? found + ' odrody' : found + ' odrôd';
    empty.hidden = found !== 0;
  };

  form.addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', update);
  section.addEventListener('change', update);
  reset.addEventListener('click', () => {
    search.value = '';
    section.value = '';
    update();
    search.focus();
  });
  update();
})();
