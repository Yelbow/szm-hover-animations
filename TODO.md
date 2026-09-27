---
status: active
priority: 19
---

# TODO

- [ ] fse-test pagina 199 (`/szm-gsap-demo/`, de oude demo van vóór de dropdown-samenvoeging) geeft in de editor 4 ongeldige blokken (columns, 2× group, video). Dat was al zo vóór v1.13.0. Beslis: repareren of verwijderen?
- [ ] Plugin-commits v1.12.0–v1.14.0 (preview-GIF's, GSAP-entrance-replay, GSAP-entrances naar het Entrance-paneel) staan lokaal op `main`, niet gepusht. Check in de editor en push als het goed is: https://fse-test.studiozondermeer.nl/wp-admin/post.php?post=680&action=edit
- [ ] Alle animaties handmatig in de front-end nalopen of ze doen wat bedoeld is (visuele check, alleen jij kan dit beoordelen)
- [ ] Beslissen: wil je dat AI eerst een visuele-bugscan doet voordat jij zelf de animaties nakijkt? (kan een reviewer-agent worden die de index-pagina screenshot/afloopt)

## v1.14.2: fixes na de nieuwe bugscan (2026-09-27)

Nieuwe ronde: kandidaten nagelopen en zover mogelijk live gemeten op
`/szm-gsap-demo-2/` (pagina 201).

- [x] **Slider-autoplay liep door als de slider buiten beeld stond** (timer en
      GSAP-tweens bleven animeren op een blok dat niemand ziet). Er is nu een
      IntersectionObserver die autoplay stopt buiten beeld en hervat zodra de
      slider weer in beeld komt. Gemeten op 201: 6 s buiten beeld = geen
      beweging, 6 s in beeld = twee slides verder.
- [x] **Video-parallax schoof uit zijn kader**: zonder overmaat ontstond er een
      gat aan de ene kant en beeld over de buren aan de andere kant. De video
      wordt nu vooraf 2× de uitslag vergroot en de wrapper clipt
      (`overflow: hidden`). Gemeten op 201 (speed 25): video 570 px hoog in een
      kader van 380 px, op alle scrollposities beide randen gedekt.
- [x] **`primeVideo()` liet een video met geluid permanent op mute staan.** De
      oorspronkelijke mute-stand wordt nu hersteld na het primen. Niet runtime te
      meten op de demo: alle demo-video's staan daar al op mute in de opmaak.
- [x] **Accordion: dichtgeklapte panelen stonden met height:0 nog in de
      accessibility tree** en in de tab-orde. Nu `aria-hidden` + `inert` (met een
      tabindex-terugval voor browsers zonder inert). Gemeten op 201: paneel 2 en 3
      inert, paneel 1 (open) niet.
- [x] **Accordion: een link of knop in de kop klapte het paneel ook open/dicht.**
      Klikken op een link in de kop toggelt nu niet meer. Gemeten op 201 met een
      tijdelijk ingevoegde link: aria-expanded blijft false, klik op de kop zelf
      opent wel.
- [ ] **Beslissing voor Jelle:** WCAG 2.2.2 vraagt een zichtbare pauzeknop bij
      automatisch bewegende content. De pijltjes/dots stoppen autoplay wel, maar
      er is geen pause/play-knop in de navigatie. Wil je die erbij? Dat is een
      ontwerpkeuze, geen bugfix.
- Notitie: de teller-regex pakt een minteken niet mee ("-20" telt naar 20 met een
  losse min ervoor). Nagekeken en géén bug: de min blijft staan, het getal telt op
  vanaf 0, dus de uitkomst klopt. Bewust zo gelaten.
