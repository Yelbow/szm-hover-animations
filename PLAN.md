# PLAN

> Uitvoeringsstappen en open checks. Beslissingen voor Jelle staan in TODO.md.

## v1.14.1 — wat nagerekend is en wat nog open staat (2026-09-27)

Afgerond en gemeten op fse-test (dev = live daar, v1.14.1), met een echte browser
op `/szm-bugscan-animaties/` en `/szm-gsap-demo-2/`:

- Teller schrijft in een eigen `<span class="szm-gsap-counter-value">` i.p.v.
  `el.textContent`. Gemeten: `<strong>500+</strong>` blijft staan met de span
  erin, `<em>€ 250</em>` blijft staan, en een kop met tekst-reveal plus teller
  houdt zijn 5 split-eenheden en onthult ze.
- Getalnotatie: 3.5 blijft 3.5, 3,5 blijft 3,5, 1.500 blijft 1.500,
  1.234,56 blijft 1.234,56.
- Reset laat de eindwaarde in de DOM staan. Op `/szm-gsap-demo-2/`: na 14
  scrollstappen nog "500+ klanten | 98% tevreden | 12 jaar ervaring" (voorheen
  alle drie op 0), en terugscrollen replayt vanaf 0.
- Touch-hover met een touch-spoof: twee tikken 100 ms na elkaar laten na 900 ms
  beide blokken weer los.
- Geen JS-fouten op de demo-pagina's na het helemaal doorscrollen.

Nog open:

- [ ] Slider met een blok op "breed"/"volledige breedte": de extra
      `.szm-gsap-slider-wrapper` kan de core-uitlijning breken (child-selectors
      vanaf de layout-container). Nooit met een echt alignwide-blok bevestigd.
- [ ] Anker-keuze bij absolute positioning in de zusjes-plugin reset bij
      toggle-uit-en-weer-aan (staat bij die plugin in TODO.md).
- [ ] GSAP wordt op elke pagina ingeladen, ook zonder effect; de
      `szm_ha_load_gsap`-filter wordt nergens uitgezet. Prestatie, geen bug.
- [ ] Lange secties: bij `threshold: 0.15` kan een blok hoger dan ongeveer 6x de
      viewporthoogte nooit onthuld worden. Theoretisch, nooit gereproduceerd.
