/**
 * Kaartenslider: elk element met .szm-card-slider (bv. de Berichtsjabloon-lijst van een Query Loop)
 * wordt een automatische, klikbare slider zodra het meer kaarten heeft dan de grens (standaard 3).
 * Daaronder blijft het een gewoon raster. Native scroll-snap: swipe werkt op mobiel, pijltjes en bolletjes
 * scrollen een pagina, autoplay stopt bij hover, focus, aanraken en buiten beeld.
 * Instellingen (grens, seconden per slide) komen uit Instellingen > Kaartenslider via window.szmCardSlider.
 */
( function () {
	'use strict';

	var cfg = Object.assign( { threshold: 3, autoplay: 5 }, window.szmCardSlider || {} );
	var reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	function init( list ) {
		var items = Array.prototype.filter.call( list.children, function ( c ) { return c.nodeType === 1; } );
		var grens = parseInt( list.getAttribute( 'data-szm-grens' ), 10 );
		if ( isNaN( grens ) ) { grens = cfg.threshold; }
		if ( items.length <= grens ) { return; }

		var seconds = parseFloat( list.getAttribute( 'data-szm-seconden' ) );
		if ( isNaN( seconds ) ) { seconds = cfg.autoplay; }

		var wrap = document.createElement( 'div' );
		wrap.className = 'szm-card-slider-wrapper';
		list.parentNode.insertBefore( wrap, list );
		wrap.appendChild( list );
		list.classList.add( 'szm-card-slider--ready' );
		list.setAttribute( 'tabindex', '0' );
		list.setAttribute( 'aria-roledescription', 'carrousel' );

		var prev = button( 'szm-card-slider-arrow szm-card-slider-prev', 'Vorige', '&#8249;' );
		var next = button( 'szm-card-slider-arrow szm-card-slider-next', 'Volgende', '&#8250;' );
		var dotsWrap = document.createElement( 'div' );
		dotsWrap.className = 'szm-card-slider-dots';
		wrap.appendChild( prev ); wrap.appendChild( next ); wrap.appendChild( dotsWrap );

		var dots = [];
		var timer = null;

		function button( cls, label, html ) {
			var b = document.createElement( 'button' );
			b.type = 'button'; b.className = cls; b.setAttribute( 'aria-label', label ); b.innerHTML = html;
			return b;
		}
		function stap() {
			var a = items[ 0 ].getBoundingClientRect(), b = items[ 1 ].getBoundingClientRect();
			return Math.max( 1, b.left - a.left );
		}
		function perPage() { return Math.max( 1, Math.round( ( list.clientWidth + 1 ) / stap() ) ); }
		function pages() { return Math.ceil( items.length / perPage() ); }
		function page() {
			var max = list.scrollWidth - list.clientWidth;
			if ( max <= 0 ) { return 0; }
			if ( list.scrollLeft >= max - 2 ) { return pages() - 1; }
			return Math.round( list.scrollLeft / ( stap() * perPage() ) );
		}
		function goPage( p ) {
			var n = pages();
			if ( p < 0 ) { p = n - 1; }
			if ( p >= n ) { p = 0; }
			list.scrollTo( { left: p * stap() * perPage(), behavior: reduced ? 'auto' : 'smooth' } );
		}
		function buildDots() {
			dotsWrap.innerHTML = ''; dots = [];
			for ( var i = 0; i < pages(); i++ ) {
				( function ( p ) {
					var d = button( 'szm-card-slider-dot', 'Ga naar pagina ' + ( p + 1 ), '' );
					d.addEventListener( 'click', function () { stop(); goPage( p ); } );
					dotsWrap.appendChild( d ); dots.push( d );
				}( i ) );
			}
			mark();
		}
		function mark() { var p = page(); dots.forEach( function ( d, i ) { d.classList.toggle( 'is-active', i === p ); } ); }
		function start() {
			if ( reduced || seconds <= 0 || timer ) { return; }
			timer = window.setInterval( function () { goPage( page() + 1 ); }, seconds * 1000 );
		}
		function stop() { if ( timer ) { window.clearInterval( timer ); timer = null; } }

		prev.addEventListener( 'click', function () { stop(); goPage( page() - 1 ); } );
		next.addEventListener( 'click', function () { stop(); goPage( page() + 1 ); } );
		list.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'ArrowRight' ) { stop(); goPage( page() + 1 ); e.preventDefault(); }
			if ( e.key === 'ArrowLeft' ) { stop(); goPage( page() - 1 ); e.preventDefault(); }
		} );
		var scrollTimer;
		list.addEventListener( 'scroll', function () { window.clearTimeout( scrollTimer ); scrollTimer = window.setTimeout( mark, 60 ); }, { passive: true } );
		list.addEventListener( 'touchstart', stop, { passive: true } );
		wrap.addEventListener( 'focusin', stop );
		if ( window.matchMedia && window.matchMedia( '(hover: hover)' ).matches ) {
			wrap.addEventListener( 'mouseenter', stop );
			wrap.addEventListener( 'mouseleave', start );
		}
		if ( 'IntersectionObserver' in window ) {
			new IntersectionObserver( function ( es ) { es.forEach( function ( e ) { e.isIntersecting ? start() : stop(); } ); } ).observe( wrap );
		} else { start(); }
		window.addEventListener( 'resize', buildDots );
		buildDots();
	}

	function run() { document.querySelectorAll( '.szm-card-slider' ).forEach( init ); }
	if ( document.readyState === 'loading' ) { document.addEventListener( 'DOMContentLoaded', run ); } else { run(); }
}() );
