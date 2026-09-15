/**
 * SZM Hover Animations — front-end entrance trigger + touch alternative for hover.
 *
 * Twee dingen, allebei zonder GSAP-afhankelijkheid (dit script laadt altijd,
 * ook als de "szm_ha_load_gsap" filter uit staat):
 * - Entrance: voegt "szm-entrance-revealed" toe zodra een blok met de class
 *   "szm-entrance" in beeld scrollt, zodat de fade/slide-in CSS kan animeren.
 * - Hover-op-touch: ":hover" bestaat niet op een touchscreen, dus tikken op
 *   een ".szm-hover"-blok deed op mobiel niets. Voegt op "touchstart" de
 *   class "szm-hover-touch-active" toe (die de ":hover"-CSS in style.css ook
 *   matcht — zie de comments daar), en verwijdert die weer na een korte
 *   pauze zodat de gebruiker het effect echt ziet spelen, als een bewuste
 *   "tik om te bekijken"-actie i.p.v. een blijvend vastzittende hover-state.
 */
( function () {
	function revealImmediately( elements ) {
		for ( var i = 0; i < elements.length; i++ ) {
			elements[ i ].classList.add( 'szm-entrance-revealed' );
		}
	}

	function initHoverTouchAlternative() {
		// .szm-hover-group heeft geen eigen hover-effect (dus geen ":hover"-CSS op
		// zichzelf) maar moet op touch alsnog "szm-hover-touch-active" krijgen: dat
		// is wat de ".szm-hover-group.szm-hover-touch-active .szm-hover-reveal"-regel
		// in style.css matcht om kind-blokken te onthullen.
		var elements = document.querySelectorAll( '.szm-hover, .szm-hover-group' );
		if ( ! elements.length || ! ( 'ontouchstart' in window || navigator.maxTouchPoints > 0 ) ) {
			return;
		}

		var prefersReducedMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		var activeTimer = null;

		elements.forEach ? elements.forEach( bind ) : Array.prototype.forEach.call( elements, bind );

		function bind( el ) {
			el.addEventListener( 'touchstart', function () {
				if ( prefersReducedMotion ) {
					return;
				}
				window.clearTimeout( activeTimer );
				el.classList.add( 'szm-hover-touch-active' );
				// Zelf weer verwijderen na een korte "preview"-pauze — geen
				// touchend/touchcancel nodig, en werkt ook als de vinger
				// wegschuift naar scrollen (touchend zou dan niet op dit
				// element vuren).
				activeTimer = window.setTimeout( function () {
					el.classList.remove( 'szm-hover-touch-active' );
				}, 600 );
			}, { passive: true } );
		}
	}

	function init() {
		initHoverTouchAlternative();

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
