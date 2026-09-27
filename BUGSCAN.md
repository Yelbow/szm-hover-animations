# BUGSCAN (2026-09-27)

Gericht gezocht naar bugs op verzoek, op fse-test in een echte browser
nagelopen (v1.14.0, dev = live daar), tenzij er "niet getest" bij staat.
Wat ik als eerste heb gecheckt: laadt alles zonder fouten. Ja: op
`/szm-gsap-demo-2/` en `/szm-new-hover-effects-demo/` (heel de pagina
doorgescrold) nul JS-fouten, slider, accordion, process, horizontal, fullpage
en marquee initialiseren (hun `--ready`-classes staan aan) en de vier
video-effecten leveren geen fouten op. Tekst-reveal, counters, hover en de
entrance-replay werken op zichzelf. De bugs hieronder zitten in
combinaties en in randgevallen.

## 1. Counter sloopt de opmaak ín de kop (hoog)

`gsap-effects.js:907` schrijft `el.textContent = before + getal + after`. Dat
vervangt de complete inhoud van de kop door platte tekst, dus elk kind-element
in die kop verdwijnt: `<strong>`, `<em>`, `<span>` (bijv. een kleurmarkering),
`<br>` en links.

Bewijs op `/szm-bugscan-animaties/`:

- `Wij helpen <strong>500+</strong> klanten` wordt `Wij helpen 500+ klanten`,
  de `<strong>` is weg (`h2 strong` bestaat niet meer in de DOM).
- `Prijs <em>€ 250</em> per stuk` idem: de `<em>` verdwijnt zodra de teller
  begint.

Fixrichting: alleen het gevonden getal in een eigen `<span>` zetten bij het
opzetten en daarna uitsluitend de tekst van die span schrijven, in plaats van
de hele kop.

## 2. Counter + tekst-reveal op hetzelfde blok: de reveal verdwijnt (hoog)

De editor zegt expliciet dat deze twee samen mogen ("kan op dezelfde Heading
tegelijk aan staan", `editor.js:869-871`). In `gsap-effects.js` splitst
`initTextReveal()` eerst de tekst in woord-/letter-spans en zet die op
`opacity: 0`, waarna `initCounters()` de inhoud weer door platte tekst
vervangt (`:907`). De reveal-animatie speelt daarna op elementen die niet meer
in de pagina staan.

Bewijs: `Wij hebben 500 tevreden klanten in Nederland` met beide effecten aan
heeft na het tellen 0 SplitText-eenheden in de DOM (bij de controle-kop zonder
counter: alle eenheden aanwezig en netjes op `opacity 1`). Netto: de
tekst-reveal is onzichtbaar, het telt alleen.

Fixrichting: of de counter zijn getal in een eigen span laten schrijven die
SplitText intact laat (zelfde fix als 1), of in de editor blokkeren dat beide
tegelijk aan staan.

## 3. Getallen: punt-decimaal en duizendtallen gaan mis (midden)

`gsap-effects.js:888` haalt alle punten weg en zet daarna de eerste komma om:
`parseFloat( raw.replace(/\./g, '').replace(',', '.') )`. Een punt is dus
altijd een duizendtal-scheiding. Gevolg:

- `Omzet 3.5 miljoen` telt naar **35** (gemeten: eindstand "Omzet 35 miljoen").
- `Omzet 3,5 miljoen` doet het goed ("3,5").
- `Al 1.500 projecten` eindigt als **"Al 1500 projecten"** (`:906` schrijft
  `Math.round().toString()`, zonder duizendtal-notatie), dus de notatie van de
  eindtekst wijkt af van wat er in de editor staat.

Daarbij pakt de teller het eerste getal in de tekst (`:882`), dus in
"B2 Omzet 3.5 miljoen" telt hij de "2". Dat is zoals bedoeld, maar samen met
de twee punten hierboven is het resultaat onvoorspelbaar genoeg om te
ontoetsen.

## 4. Hover-op-touch: een geraakt blok blijft in de hover-stand staan (midden)

`frontend.js:137` houdt één `activeTimer` bij voor álle elementen, terwijl
`:146` bij elke tik `clearTimeout` aanroept. Tik je binnen 600 ms twee hover-
blokken aan, dan is de timer van het eerste geannuleerd en wordt de class
`szm-hover-touch-active` daar nooit meer weggehaald: dat blok blijft
ingezoomd/verdonkerd/onthuld staan.

Bewijs (touch gesimuleerd via een tijdelijke mu-plugin, daarna weer weg):
kaart 1 tikken en 700 ms wachten geeft geen class meer (goed), kaart 1 tikken
en 100 ms later kaart 2 tikken laat kaart 1 na 900 ms nog steeds de class
houden (fout).

Fixrichting: de timer per element bewaren (bijv. via een WeakMap of een
property op het element) in plaats van één gedeelde variabele.

## 5. De teller verandert de zichtbare tekst ook buiten beeld (laag)

`entranceReplay()` zet bij het uit beeld raken (`gsap-effects.js:823-825`)
`counter.value = 0` en rendert opnieuw, dus wie langs een teller scrolt laat
"0+ klanten" achter in de DOM. Dat is bewust (reset voor de replay), maar het
is wel de tekst die een schermlezer voorleest, die een crawler kan indexeren
en die in een screenshot/print terechtkomt.

## 6. Risico dat ik niet getest heb: slider-wrapper en uitlijning (laag)

`initSliders()` (`gsap-effects.js:306-309`) zet een extra
`.szm-gsap-slider-wrapper` om het Columns-blok. Thema- en core-CSS voor
brede/volledige uitlijning werkt met child-selectors vanaf de layout-container
(`.is-layout-constrained > .alignwide` enz.), dus een blok dat op "breed" of
"volledige breedte" staat kan na het inpakken zijn uitlijning verliezen. Ik heb
geen slider met alignwide op een pagina gehad om dit te bevestigen: staat op
de lijst om een keer na te kijken zodra er zo'n blok op een echte pagina komt.

## 7. Klein: alles wordt altijd geladen (laag)

De GSAP-module (gsap + ScrollTrigger + SplitText) wordt op elke pagina
ingeladen, ook als er geen enkel effect op staat; de filter
`szm_ha_load_gsap` bestaat maar wordt nergens op false gezet. SplitText is
bovendien een betaald GSAP-plugin (Club GreenSock) die je hier vendor't: voor
klantsites is het goed om te weten dat die licentie per project moet kloppen.
Geen bug, wel iets om bewust te zijn.

## Verder nog nagekeken, geen bug gevonden

- Entrance-threshold: bij `threshold: 0.15` kan een blok dat hoger is dan
  ongeveer 6x de viewporthoogte nooit 15% zichtbaar halen en dus nooit
  onthuld worden. In de praktijk komt dat neer op extreem lange secties
  (mobiel: een lange galerij). Theoretisch, niet gereproduceerd.
- De reset-regel (100vh in/uit beeld) van entrance en van tekst/counter werkt
  zoals bedoeld: bij terugscrollen speelt het opnieuw.
- Counter, marquee, slider, accordion, magnetic, horizontal, fullpage en
  process: geen runtime-fouten, ook niet na het helemaal doorscrollen van de
  demo-pagina's.

## Testpagina's op fse-test

- `/szm-bugscan-animaties/` (post 708): counters met opmaak, punt- en
  komma-decimaal, duizendtallen, tekst-reveal + counter, twee hover-kaarten
  voor de tik-test.
