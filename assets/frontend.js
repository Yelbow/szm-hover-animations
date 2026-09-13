/**
 * SZM Hover Animations — front-end entrance trigger.
 *
 * Voegt de class "szm-entrance-revealed" toe zodra een blok met de class
 * "szm-entrance" in beeld scrollt, zodat de fade/slide-in CSS in style.css
 * kan animeren. Hover-animaties hebben dit script niet nodig (pure CSS
 * ":hover"); dit script gaat alleen over entrance-animaties.
 */
( function () {
	function revealImmediately( elements ) {
		for ( var i = 0; i < elements.length; i++ ) {
			elements[ i ].classList.add( 'szm-entrance-revealed' );
		}
	}

	function init() {
		var elements = document.querySelectorAll( '.szm-entrance' );
		if ( ! elements.length ) {
			return;
		}

		// Geen IntersectionObserver-support, of gebruiker wil geen animaties:
		// direct tonen in plaats van (per ongeluk) blijvend onzichtbaar laten.
		var prefersReducedMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		if ( ! ( 'IntersectionObserver' in window ) || prefersReducedMotion ) {
			revealImmediately( elements );
			return;
		}

		var observer = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						entry.target.classList.add( 'szm-entrance-revealed' );
						observer.unobserve( entry.target );
					}
				} );
			},
			{
				threshold: 0.15,
				rootMargin: '0px 0px -10% 0px',
			}
		);

		elements.forEach ? elements.forEach( function ( el ) {
			observer.observe( el );
		} ) : Array.prototype.forEach.call( elements, function ( el ) {
			observer.observe( el );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
