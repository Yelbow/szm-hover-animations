// Voorbeeldpagina voor de preview-GIF's (fse-test /szm-previews/): per effect één
// kaart met een eigen anchor, zodat opnames.sh elk effect los kan opnemen.
// Body voor animatie-plugin-inbouwen/scripts/build-page.mjs (c = createBlock).
const spacer = h => c('core/spacer', { height: h });
const kaart = (id, extra, titel) => c('core/group', {
  anchor: id,
  backgroundColor: 'pale-cyan-blue',
  style: { spacing: { padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' } }, border: { radius: '12px' } },
  ...extra,
}, [
  c('core/heading', { level: 3, content: titel }),
  c('core/paragraph', { content: 'Voorbeeldkaart met een kop en een korte tekst.' }),
]);
const sectie = (binnen) => c('core/group', { layout: { type: 'constrained', contentSize: '420px' } }, [spacer('45vh'), ...binnen, spacer('45vh')]);

const hovers = ['lift', 'zoom-in', 'zoom-out', 'fade', 'glow', 'tilt', 'shadow'];
const entrances = ['fade-in', 'slide-up'];
const teksten = { chars: 'Per letter onthuld', words: 'Per woord onthuld in beeld', lines: 'Per regel onthuld, een langere kop die over twee regels loopt' };

return [
  c('core/paragraph', { content: 'Opnamepagina voor de preview-GIF\'s in de Inspector (tools/previews/opnames.sh). Niet voor bezoekers.' }),
  spacer('100vh'),
  ...hovers.map(h => sectie([kaart('prev-hover-' + h, { szmHoverAnimation: h }, 'Hover')])),
  ...entrances.map(e => sectie([kaart('prev-entrance-' + e, { szmEntranceAnimation: e }, 'Entrance')])),
  ...Object.entries(teksten).map(([k, t]) => sectie([c('core/heading', { anchor: 'prev-text-' + k, szmGsapText: k, szmGsapLoop: false, content: t })])),
  sectie([c('core/heading', { anchor: 'prev-counter', szmGsapCounter: true, szmGsapLoop: false, content: '250+ klanten' })]),
  sectie([c('core/buttons', { anchor: 'prev-magnetic' }, [c('core/button', { text: 'Magnetische knop', szmGsapMagnetic: true })])]),
  sectie([c('core/list', { anchor: 'prev-marquee', szmGsapMarquee: true }, ['Webdesign', 'Branding', 'SEO', 'Webshops', 'Onderhoud'].map(t => c('core/list-item', { content: t })))]),
  sectie([c('core/group', { anchor: 'prev-group-process', szmGsapEffect: 'process' }, [1, 2, 3].map(n =>
    c('core/group', { backgroundColor: 'pale-cyan-blue', style: { spacing: { padding: { top: '20px', right: '20px', bottom: '20px', left: '20px' } } } }, [
      c('core/heading', { level: 3, content: 'Stap ' + n }),
      c('core/paragraph', { content: 'Uitleg bij stap ' + n + ' die inklapt tijdens scrollen.' }),
    ])))]),
  spacer('100vh'),
];
