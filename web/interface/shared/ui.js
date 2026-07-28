window.UI = {
  setLang(lang) {
    const root = document.documentElement;
    root.setAttribute('data-lang', lang);

    const t = (window.BODA_DATA.i18n && window.BODA_DATA.i18n[lang]) || window.BODA_DATA.i18n.es;
    root.setAttribute('lang', t.htmlLang || lang);

    document.title = t.pageTitle || document.title;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && typeof t[key] === 'string') {
        el.textContent = t[key];
      }
    });

    this.fillList('#guest-pays', t.guestPays || window.BODA_DATA.offerModel.guestPays);
    this.fillList('#couple-offers', t.coupleOffers || window.BODA_DATA.offerModel.coupleOffers);
    this.fillList('#benefits', t.benefits || window.BODA_DATA.rocaAzulBenefits);

    this.fillList('#flight-highlights', t.flightHighlights || []);
    this.fillList('#nonstop-gdl', t.nonstopGdl || []);
    this.fillList('#nonstop-pvr', t.nonstopPvr || []);
    this.fillList('#buy-windows', t.buyWindows || []);
    this.fillList('#go-buy-rules', t.goBuyRules || []);
    this.fillList('#time-short', t.timeShortRules || []);
    this.fillList('#time-long', t.timeLongRules || []);
    this.fillList('#near-far', t.nearFarRules || []);
    this.fillList('#favorites-nearby', t.favoritesNearby || []);
    this.fillList('#favorites-trips', t.favoritesTrips || []);
    this.fillLinkList('#map-links', t.mapLinks || []);
  },

  fillList(selector, items) {
    const ul = document.querySelector(selector);
    if (!ul) return;
    ul.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
  },

  fillLinkList(selector, items) {
    const ul = document.querySelector(selector);
    if (!ul) return;
    ul.innerHTML = '';

    items.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.label;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      ul.appendChild(li);
    });
  }
};
