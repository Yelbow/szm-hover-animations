#!/usr/bin/env bash
# Neemt de preview-GIF's op voor alle bestaande plugin-effecten zonder concurrent-
# origineel (backfill v1.12.0), van fse-test. Effecten die uit de animatie-flow
# komen krijgen hun GIF van het origineel (zie skill animatie-volledige-flow) en
# staan hier niet in. Gebruik: tools/previews/opnames.sh [sleutel-filter]
set -u
GIF="node $HOME/.claude/skills/site-animatie-analyse/scripts/gif.js"
UIT="$(cd "$(dirname "$0")/../.." && pwd)/assets/previews"
B=http://localhost:8310
P=$B/szm-previews/     # opnamepagina, bron: tools/previews/blokken.js
D=$B/szm-gsap-demo-2/
N=$B/szm-new-hover-effects-demo/

neem() { # sleutel, rest = gif.js-argumenten
  local k=$1; shift
  [[ -n "${FILTER:-}" && "$k" != *"$FILTER"* ]] && return
  $GIF --uit "$UIT/$k.gif" "$@" || echo "MISLUKT: $k"
}
FILTER=${1:-}

for h in lift zoom-in zoom-out fade glow tilt shadow; do
  neem hover-$h --url $P --doel "#prev-hover-$h" --modus hover --duur 1400 --marge 40
done
neem hover-darken --url $N --doel .szm-hover-darken --modus hover --duur 1400
neem hover-spread --url $N --doel .szm-hover-spread --modus hover --duur 1400 --breed 600
neem hover-reveal --url $N --doel .szm-hover-group --hover .szm-hover-group --modus hover --duur 1400
for e in fade-in slide-up; do
  neem entrance-$e --url $P --doel "#prev-entrance-$e" --duur 1600 --marge 40
done
for t in chars words lines; do
  neem text-$t --url $P --doel "#prev-text-$t" --duur 2200
done
neem counter  --url $P --doel "#prev-counter" --duur 2600
neem magnetic --url $P --doel "#prev-magnetic" --modus hover --duur 1400 --marge 50
neem marquee  --url $P --doel "#prev-marquee" --duur 3000
neem group-process --url $P --doel "#prev-group-process" --modus scroll --beeld
neem columns-process   --url $D --doel .szm-gsap-process --modus scroll --beeld
neem columns-slider    --url $P --doel .szm-gsap-slider-wrapper --modus klik --klik .szm-gsap-slider-next --kliks 2 --duur 2000
neem group-accordion   --url $D --doel .szm-gsap-accordion --modus klik --klik ".szm-gsap-accordion-item:nth-child(2) .szm-gsap-accordion-trigger" --duur 1200
neem group-horizontal  --url $D --doel .szm-gsap-horizontal --modus scroll --beeld
neem group-fullpage    --url $D --doel .szm-gsap-fullpage --modus scroll --beeld
neem video-parallax       --url $D --doel .szm-gsap-video-parallax --modus scroll
neem video-reveal         --url $D --doel .szm-gsap-video-reveal --duur 1800
neem video-play-on-scroll --url $D --doel .szm-gsap-video-play-on-scroll --duur 1400 --gif-breed 260
neem video-scrub          --url $D --doel .szm-gsap-video-scrub --modus scroll --beeld --stappen 20 --gif-breed 260
