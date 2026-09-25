/**
 * SZM Hover Animations — front-end entrance trigger + touch alternative for hover.
 *
 * Twee dingen, allebei zonder GSAP-afhankelijkheid (dit script laadt altijd,
 * ook als de "szm_ha_load_gsap" filter uit staat):
 * - Entrance: voegt "szm-entrance-revealed" toe zodra een blok met de class
 *   "szm-entrance" in beeld scrollt, zodat de fade/slide-in CSS kan animeren.
 *   Zodra het blok meer dan 100vh boven of onder de viewport uit gescrolld is
 *   wordt "szm-entrance-revealed" weer verwijderd, zodat de animatie opnieuw
 *   afspeelt als de gebruiker het blok nogmaals in beeld scrollt (i.p.v. maar
 *   één keer per paginabezoek).
 * - Hover-op-touch: ":hover" bestaat niet op een touchscreen, dus tikken op
 *   een ".szm-hover"-blok deed op mobiel niets. Voegt op "touchstart" de
 *   class "szm-hover-touch-active" toe (die de ":hover"-CSS in style.css ook
 *   matcht — zie de comments daar), en verwijdert die weer na een korte
 *   pauze zodat de gebruiker het effect echt ziet spelen, als een bewuste
 *   "tik om te bekijken"-actie i.p.v. een blijvend vastzittende hover-state.
 * - Toepassen op kinderen: een container met "szm-entrance-children" of
 *   "szm-hover-children" geeft zijn animatie door aan zijn kind-blokken (zie
 *   collectTargets). Die krijgen hier gewoon de normale szm-entrance-/szm-
 *   hover-classes, dus alle CSS en de reset-logica hieronder gelden ongewijzigd.
 */
( function () {
	// Kolommen, grids, rijen, knoppen, galerij en social-links animeren niet
	// zelf maar zijn "doorzichtig": hun kinderen worden los geanimeerd, zodat
	// bv. Groep > [Kop, Kolommen > 3x Kolom] vier losse stappen oplevert.
	function isPassThrough( el, kind ) {
		var cl = el.classList;
		// GSAP-containers (slider, marquee, …) niet opbreken: die zijn één geheel.
		if ( hasOwnAnimation( el, kind ) || /(^|\s)szm-gsap-/.test( el.className || '' ) ) {
			return false;
		}
		if ( cl.contains( 'wp-block-columns' ) || cl.contains( 'wp-block-buttons' ) ||
			cl.contains( 'wp-block-gallery' ) || cl.contains( 'wp-block-social-links' ) ) {
			return true;
		}
		return cl.contains( 'wp-block-group' ) && (
			cl.contains( 'is-layout-grid' ) ||
			( cl.contains( 'is-layout-flex' ) && ! cl.contains( 'is-vertical' ) )
		);
	}

	// Eigen instelling wint: zo'n blok krijgt niets van de ouder. Tekst-reveal
	// is zelf al een entrance, dus die ook niet dubbel animeren.
	function hasOwnAnimation( el, kind ) {
		var cl = el.classList;
		return cl.contains( 'szm-' + kind ) || cl.contains( 'szm-' + kind + '-children' ) ||
			( kind === 'entrance' && cl.contains( 'szm-gsap-text' ) );
	}

	function isSkippable( el ) {
		var tag = el.tagName;
		if ( tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'NOSCRIPT' ) {
			return true;
		}
		// Achtergrondlagen van Cover.
		return /(^|\s)wp-block-cover__(background|image-background|video-background)(\s|$)/.test( el.className || '' );
	}

	// Classic-thema's/Cover: kind-blokken zitten in een inner-container.
	function blockChildren( el ) {
		var list = [];
		Array.prototype.forEach.call( el.children, function ( child ) {
			if ( /(^|\s)wp-block-(group|cover)__inner-container(\s|$)/.test( child.className || '' ) ) {
				list = list.concat( blockChildren( child ) );
			} else if ( ! isSkippable( child ) ) {
				list.push( child );
			}
		} );
		return list;
	}

	function collectTargets( parent, kind ) {
		var out = [];
		( function walk( el ) {
			blockChildren( el ).forEach( function ( child ) {
				if ( isPassThrough( child, kind ) ) {
					walk( child );
				} else if ( ! hasOwnAnimation( child, kind ) ) {
					out.push( child );
				}
			} );
		} )( parent );
		return out;
	}

	function applyChildren( kind ) {
		var parents = document.querySelectorAll( '.szm-' + kind + '-children' );
		Array.prototype.forEach.call( parents, function ( parent ) {
			var variant = parent.getAttribute( 'data-szm-' + kind + '-children' );
			if ( variant ) {
				collectTargets( parent, kind ).forEach( function ( target, i ) {
					target.classList.add( 'szm-' + kind, 'szm-' + kind + '-' + variant, 'szm-' + kind + '-inherited' );
					if ( kind === 'entrance' ) {
						target.szmStaggerParent = parent;
						target.szmStaggerIndex  = i;
					}
				} );
			}
			parent.classList.add( 'szm-children-ready' );
		} );
	}

	// Stagger als wachtrij per ouder: elk kind dat in beeld komt start
	// minimaal "stap" ms na het vorige, op volgorde. Komen alle kinderen
	// tegelijk in beeld, dan krijg je dus 0, 1, 2, 3 x stap; bij een lang
	// grid loopt de stagger door per rij die binnenscrollt.
	function setStaggerDelay( el ) {
		var parent = el.szmStaggerParent;
		if ( ! parent ) {
			return;
		}
		var step = parseInt( parent.getAttribute( 'data-szm-stagger' ), 10 ) || 0;
		var now  = window.performance ? performance.now() : Date.now();
		var slot = Math.max( now, parent.szmNextSlot || 0 );
		el.style.setProperty( '--szm-entrance-delay', Math.round( slot - now ) + 'ms' );
		parent.szmNextSlot = slot + step;
	}

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
		applyChildren( 'hover' );
		applyChildren( 'entrance' );
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

		function reveal( entries ) {
			entries.filter( function ( entry ) {
				return entry.isIntersecting && ! entry.target.classList.contains( 'szm-entrance-revealed' );
			} ).sort( function ( a, b ) {
				return ( a.target.szmStaggerIndex || 0 ) - ( b.target.szmStaggerIndex || 0 );
			} ).forEach( function ( entry ) {
				setStaggerDelay( entry.target );
				entry.target.classList.add( 'szm-entrance-revealed' );
			} );
		}

		// Niet meer unobserven na de eerste reveal: het blok moet opnieuw
		// kunnen animeren als het weer in beeld komt (zie resetIfFar hieronder).
		var observer = new IntersectionObserver( reveal, {
			threshold: 0.15,
			rootMargin: '0px 0px -10% 0px',
		} );
		// "Fade-in reveal" (naar nixowebbuilding.nl) triggert eerder: al bij 10%
		// in beeld, 50px boven de onderrand.
		var revealObserver = new IntersectionObserver( reveal, {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px',
		} );

		// Reset: zodra een blok meer dan 100vh (100% van de viewporthoogte,
		// boven én onder) buiten beeld gescrolld is, "szm-entrance-revealed"
		// weer weghalen zodat de volgende keer intersecten weer een reveal
		// triggert. rootMargin-percentages resolven tegen de viewporthoogte
		// (root = null), dus "100%" hier is letterlijk 100vh.
		var resetObserver = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( ! entry.isIntersecting ) {
					entry.target.classList.remove( 'szm-entrance-revealed' );
				}
			} );
		}, {
			threshold: 0,
			rootMargin: '100% 0px 100% 0px',
		} );

		Array.prototype.forEach.call( elements, function ( el ) {
			( el.classList.contains( 'szm-entrance-reveal' ) ? revealObserver : observer ).observe( el );
			resetObserver.observe( el );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
