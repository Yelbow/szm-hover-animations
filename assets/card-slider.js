/**
 * Kaartenslider: elk element met .szm-card-slider (een lijst van een Query Loop of een Rij) wordt een automatische,
 * klikbare slider zodra het meer kaarten heeft dan de grens (standaard 3). Daaronder blijft het een gewoon raster.
 * - Eén kaart per keer, endless: voor en achter de echte kaarten staan kopieën, na de laatste kaart schuift hij gewoon
 *   door naar de eerste (geen terugspoelen).
 * - Responsive: 3 kaarten in beeld, 2 op tablet, op mobiel 1,25 zodat de volgende kaart al uitsteekt (zie style.css).
 * - Pijltjes, bolletjes (één per kaart), swipe/slepen, pijltjestoetsen, autoplay (stopt bij hover, focus, aanraken, buiten beeld).
 * Instellingen: Instellingen > Kaartenslider (window.szmCardSlider), per blok te overschrijven met data-szm-grens,
 * data-szm-seconden en data-szm-snelheid (het blokpaneel "Kaartenslider" in de editor zet die).
 */
( function () {
	'use strict';

	var cfg = Object.assign( { threshold: 3, autoplay: 5, speed: 500 }, window.szmCardSlider || {} );
	var reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var K = 4; // kopieën aan elk uiteinde, genoeg voor 3 in beeld plus het uitstekende kaartje

	function num( v, d ) { var x = parseFloat( v ); return isNaN( x ) ? d : x; }

	function init( list ) {
		var items = Array.prototype.filter.call( list.children, function ( c ) { return c.nodeType === 1; } );
		var n = items.length;
		var grens = num( list.getAttribute( 'data-szm-grens' ), cfg.threshold );
		if ( n <= grens || n < 2 ) { return; }
		var seconds = num( list.getAttribute( 'data-szm-seconden' ), cfg.autoplay );
		var speed = num( list.getAttribute( 'data-szm-snelheid' ), cfg.speed );

		var outer = document.createElement( 'div' );
		outer.className = 'szm-card-slider-wrapper';
		var viewport = document.createElement( 'div' );
		viewport.className = 'szm-card-slider-viewport';
		// Vóór het ombouwen meten waar de kaartjes nu staan: dat is de afstand tot de
		// schermrand, en die ruimte mag de slider gebruiken (bleed) zodat een half
		// zichtbare kaart door de schermrand wordt afgesneden en niet door de padding.
		var start = list.getBoundingClientRect();
		list.parentNode.insertBefore( outer, list );
		outer.appendChild( viewport );
		viewport.appendChild( list );
		list.classList.add( 'szm-card-slider--ready' );
		zetBleed( Math.max( 0, Math.round( start.left ) ), Math.max( 0, Math.round( window.innerWidth - start.right ) ) );
		list.style.setProperty( '--szm-speed', ( reduced ? 0 : speed ) + 'ms' );
		outer.setAttribute( 'role', 'region' );
		outer.setAttribute( 'aria-roledescription', 'carrousel' );
		outer.setAttribute( 'tabindex', '0' );

		function kloon( el ) {
			var c = el.cloneNode( true );
			c.setAttribute( 'aria-hidden', 'true' );
			c.setAttribute( 'inert', '' );
			c.classList.add( 'szm-card-slider-kloon' );
			Array.prototype.forEach.call( c.querySelectorAll( 'a,button,input,select,textarea' ), function ( x ) { x.setAttribute( 'tabindex', '-1' ); } );
			return c;
		}
		var voor = [], na = [];
		for ( var j = 0; j < K; j++ ) {
			voor.push( kloon( items[ ( ( n - K + j ) % n + n ) % n ] ) );
			na.push( kloon( items[ j % n ] ) );
		}
		voor.forEach( function ( c ) { list.insertBefore( c, items[ 0 ] ); } );
		na.forEach( function ( c ) { list.appendChild( c ); } );

		// Geen native slepen van links en afbeeldingen, dat onderbreekt het slepen met de muis.
		Array.prototype.forEach.call( list.querySelectorAll( 'a, img' ), function ( x ) { x.setAttribute( 'draggable', 'false' ); } );
		list.addEventListener( 'dragstart', function ( e ) { e.preventDefault(); } );

		function knop( cls, label, html ) {
			var b = document.createElement( 'button' );
			b.type = 'button'; b.className = cls; b.setAttribute( 'aria-label', label ); b.innerHTML = html;
			return b;
		}
		var prev = knop( 'szm-card-slider-arrow szm-card-slider-prev', 'Vorige', '&#8249;' );
		var next = knop( 'szm-card-slider-arrow szm-card-slider-next', 'Volgende', '&#8250;' );
		var dotsWrap = document.createElement( 'div' );
		dotsWrap.className = 'szm-card-slider-dots';
		outer.appendChild( prev ); outer.appendChild( next ); outer.appendChild( dotsWrap );
		var dots = items.map( function ( _, i ) {
			var d = knop( 'szm-card-slider-dot', 'Ga naar kaart ' + ( i + 1 ), '' );
			d.addEventListener( 'click', function () { stop(); go( i, true ); } );
			dotsWrap.appendChild( d );
			return d;
		} );

		var idx = 0, step = 1, bezig = false, timer = null, vangnet = null, sleep = null;

		function meet() {
			var gap = parseFloat( getComputedStyle( list ).columnGap ) || 0;
			step = items[ 0 ].getBoundingClientRect().width + gap;
		}
		// Ruimte tussen de tekstkolom en de schermrand: die mag de slider gebruiken.
		function zetBleed( links, rechts ) {
			links = Math.min( Math.max( 0, links ), 200 );
			rechts = Math.min( Math.max( 0, rechts ), 200 );
			outer.style.setProperty( '--szm-bleed-l', links + 'px' );
			outer.style.setProperty( '--szm-bleed-r', rechts + 'px' );
			outer.classList.toggle( 'szm-card-slider-wrapper--bleed', links > 1 || rechts > 1 );
		}
		function herberekenBleed() {
			var p = outer.parentNode;
			if ( ! p ) { return; }
			var cs = getComputedStyle( p );
			var r = p.getBoundingClientRect();
			var links = r.left + ( parseFloat( cs.borderLeftWidth ) || 0 ) + ( parseFloat( cs.paddingLeft ) || 0 );
			var binnen = p.clientWidth - ( parseFloat( cs.paddingLeft ) || 0 ) - ( parseFloat( cs.paddingRight ) || 0 );
			zetBleed( links, window.innerWidth - ( links + binnen ) );
		}
		function zet( x, animeer ) {
			list.style.transition = animeer && speed > 0 && ! reduced ? '' : 'none';
			list.style.transform = 'translate3d(' + x + 'px,0,0)';
		}
		function basis( i ) { return -( K + i ) * step; }
		function markeer() {
			var a = ( ( idx % n ) + n ) % n;
			dots.forEach( function ( d, i ) { d.classList.toggle( 'is-active', i === a ); } );
		}
		function normaliseer() {
			window.clearTimeout( vangnet );
			if ( idx < 0 || idx >= n ) { idx = ( ( idx % n ) + n ) % n; zet( basis( idx ), false ); }
			bezig = false; markeer();
		}
		function go( i, animeer ) {
			if ( bezig ) { return; }
			idx = i;
			if ( animeer && speed > 0 && ! reduced ) {
				bezig = true;
				zet( basis( idx ), true );
				vangnet = window.setTimeout( normaliseer, speed + 150 );
			} else {
				zet( basis( idx ), false );
				normaliseer();
			}
			markeer();
		}
		list.addEventListener( 'transitionend', function ( e ) { if ( e.target === list && e.propertyName === 'transform' ) { normaliseer(); } } );

		function start() {
			if ( reduced || seconds <= 0 || timer ) { return; }
			timer = window.setInterval( function () { go( idx + 1, true ); }, seconds * 1000 );
		}
		function stop() { if ( timer ) { window.clearInterval( timer ); timer = null; } }

		prev.addEventListener( 'click', function () { stop(); go( idx - 1, true ); } );
		next.addEventListener( 'click', function () { stop(); go( idx + 1, true ); } );
		outer.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'ArrowRight' ) { stop(); go( idx + 1, true ); e.preventDefault(); }
			if ( e.key === 'ArrowLeft' ) { stop(); go( idx - 1, true ); e.preventDefault(); }
		} );

		// Slepen en swipen (muis en aanraking), verticaal scrollen blijft van de pagina (touch-action: pan-y in de CSS).
		viewport.addEventListener( 'pointerdown', function ( e ) {
			if ( bezig || ( e.pointerType === 'mouse' && e.button !== 0 ) ) { return; }
			sleep = { x: e.clientX, y: e.clientY, dx: 0, actief: false, id: e.pointerId };
			stop();
		} );
		viewport.addEventListener( 'pointermove', function ( e ) {
			if ( ! sleep || e.pointerId !== sleep.id ) { return; }
			sleep.dx = e.clientX - sleep.x;
			if ( ! sleep.actief && Math.abs( sleep.dx ) > 8 && Math.abs( sleep.dx ) > Math.abs( e.clientY - sleep.y ) ) {
				sleep.actief = true;
				try { viewport.setPointerCapture( e.pointerId ); } catch ( err ) { /* ok */ }
				viewport.classList.add( 'is-slepen' );
			}
			if ( sleep.actief ) { zet( basis( idx ) + sleep.dx, false ); }
		} );
		function loslaten( e ) {
			if ( ! sleep || e.pointerId !== sleep.id ) { return; }
			var s = sleep; sleep = null;
			viewport.classList.remove( 'is-slepen' );
			if ( ! s.actief ) { return; }
			var stappen = Math.max( -3, Math.min( 3, -Math.round( s.dx / step ) ) );
			if ( stappen === 0 && Math.abs( s.dx ) > step * 0.15 ) { stappen = s.dx < 0 ? 1 : -1; }
			// een sleepbeweging mag geen klik op een link worden
			var blok = function ( ev ) { ev.preventDefault(); ev.stopPropagation(); };
			viewport.addEventListener( 'click', blok, { capture: true, once: true } );
			window.setTimeout( function () { viewport.removeEventListener( 'click', blok, true ); }, 0 );
			if ( stappen === 0 ) { zet( basis( idx ), true ); } else { go( idx + stappen, true ); }
		}
		viewport.addEventListener( 'pointerup', loslaten );
		viewport.addEventListener( 'pointercancel', loslaten );

		outer.addEventListener( 'focusin', stop );
		if ( window.matchMedia && window.matchMedia( '(hover: hover)' ).matches ) {
			outer.addEventListener( 'mouseenter', stop );
			outer.addEventListener( 'mouseleave', start );
		}
		document.addEventListener( 'visibilitychange', function () { if ( document.hidden ) { stop(); } } );
		if ( 'IntersectionObserver' in window ) {
			new IntersectionObserver( function ( es ) { es.forEach( function ( e ) { e.isIntersecting ? start() : stop(); } ); } ).observe( outer );
		} else { start(); }

		var laatsteBreedte = 0;
		function pasAan() {
			var b = viewport.clientWidth;
			if ( b === laatsteBreedte ) { return; }
			laatsteBreedte = b;
			meet(); window.clearTimeout( vangnet ); bezig = false; zet( basis( idx ), false );
		}
		if ( 'ResizeObserver' in window ) { new ResizeObserver( pasAan ).observe( viewport ); } else { window.addEventListener( 'resize', pasAan ); }
		window.addEventListener( 'resize', herberekenBleed );
		meet(); go( 0, false );
	}

	function run() { document.querySelectorAll( '.szm-card-slider' ).forEach( init ); }
	if ( document.readyState === 'loading' ) { document.addEventListener( 'DOMContentLoaded', run ); } else { run(); }
}() );
