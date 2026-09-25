/**
 * SZM Hover Animations — GSAP module.
 *
 * GSAP-powered behaviours, purely driven by data-attributes that
 * assets/editor.js writes onto the saved block markup — no new blocks:
 * - Slider: turns a Columns block's columns into a swipeable/autoplay slider.
 * - Process steps: pins a Columns block while its second column's direct
 *   children collapse one by one, sticky-scrollytelling style.
 * - Accordion: turns a Group block's direct children into collapsible panels.
 * - Horizontal scroll: pins a Group and scrolls its children sideways.
 * - Video: parallax / reveal / play-on-scroll effects on Video and Cover blocks.
 * - Text reveal: SplitText char/word/line stagger-in on Heading/Paragraph.
 * - Counter: counts a Heading's number up from 0 on scroll into view.
 * - Magnetic button: cursor-following pull on Button blocks.
 * - Marquee: infinite auto-scrolling loop of a List block's items.
 *
 * Loads gsap + ScrollTrigger + SplitText from assets/vendor/gsap (enqueued
 * as deps in szm-hover-animations.php) before this file runs. Every init
 * function bails immediately if there's nothing on the page for it to do,
 * same early-return pattern as frontend.js.
 */
( function () {
	if ( typeof window.gsap === 'undefined' ) {
		return;
	}

	var gsap = window.gsap;
	var prefersReducedMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	// Touch/mobile devices don't have real hover: a finger scrolling past an
	// element can still fire a synthetic "mouseenter" (for :hover CSS) without
	// ever firing a matching "mouseleave", so any effect that pauses-on-enter/
	// resumes-on-leave must skip that on devices without genuine hover.
	var supportsHover = ! window.matchMedia || window.matchMedia( '(hover: hover)' ).matches;

	/**
	 * Primes a <video> so mobile browsers actually decode/render a frame.
	 * Several mobile WebKit/Chromium builds keep a <video> element's decoder
	 * idle until it has genuinely played at least once — setting currentTime
	 * (scrub) or just fading opacity/scale (reveal) on an un-played video can
	 * show a blank/black frame until then. A muted, playsinline play()+pause()
	 * (allowed without a user gesture per the muted-autoplay policy) forces
	 * that first decode. No-op, silently, if the browser refuses anyway.
	 */
	function primeVideo( video ) {
		video.muted = true;
		video.setAttribute( 'muted', '' );
		video.setAttribute( 'playsinline', '' );
		var playPromise = video.play();
		if ( playPromise && typeof playPromise.then === 'function' ) {
			playPromise.then( function () {
				video.pause();
			} ).catch( function () {
				// Autoplay refused (e.g. low-power mode) — nothing more we can do
				// without a user gesture; the effect still degrades gracefully.
			} );
		} else {
			video.pause();
		}
	}

	if ( window.ScrollTrigger ) {
		gsap.registerPlugin( window.ScrollTrigger );
	}
	if ( window.SplitText ) {
		gsap.registerPlugin( window.SplitText );
	}

	function num( value, fallback ) {
		var n = parseFloat( value );
		return isNaN( n ) ? fallback : n;
	}

	// Curated easing-presets → concrete GSAP-ease. CSS-kant van dezelfde
	// presets staat in assets/editor.js (EASE_CSS_MAP) en wordt daar als
	// --szm-hover-ease/--szm-entrance-ease inline style gezet.
	var EASE_GSAP_MAP = {
		smooth: 'power2.out',
		snappy: 'power4.out',
		bouncy: 'back.out(1.7)',
		linear: 'none',
	};

	function gsapEase( element ) {
		var preset = element.getAttribute( 'data-szm-ease' );
		return EASE_GSAP_MAP[ preset ] || EASE_GSAP_MAP.smooth;
	}

	/**
	 * Hoogte (px) van alles dat fixed/sticky bovenaan de pagina staat — een
	 * site-header en/of de WP-adminbalk (#wpadminbar, alleen zichtbaar
	 * ingelogd). Elk gepind scroll-effect hieronder gebruikt dit om zijn
	 * pin-startpunt te corrigeren, zodat het nooit half onder een vaste menu-
	 * balk begint te pinnen — dit is geen gebruikersinstelling, dit moet
	 * altijd kloppen, ongeacht welk "wanneer begint pinnen"-preset iemand
	 * kiest. Meet opnieuw bij elke aanroep: een sticky header kan van hoogte
	 * veranderen (bv. scroll-afhankelijke compacte header).
	 */
	function getFixedHeaderOffset() {
		var offset = 0;

		var adminBar = document.getElementById( 'wpadminbar' );
		if ( adminBar && window.getComputedStyle( adminBar ).position === 'fixed' ) {
			offset = Math.max( offset, adminBar.getBoundingClientRect().bottom );
		}

		var probeX = window.innerWidth / 2;
		var probeY = Math.min( offset + 2, window.innerHeight - 1 );
		var el = document.elementFromPoint ? document.elementFromPoint( probeX, probeY ) : null;

		while ( el && el !== document.body && el !== document.documentElement ) {
			var position = window.getComputedStyle( el ).position;
			if ( position === 'fixed' || position === 'sticky' ) {
				var rect = el.getBoundingClientRect();
				if ( rect.top <= offset && rect.bottom > offset ) {
					offset = Math.max( offset, rect.bottom );
				}
			}
			el = el.parentElement;
		}

		return Math.round( offset );
	}

	/**
	 * Bouwt een ScrollTrigger "start"-functie voor een gepind effect: het
	 * preset (top/half/center — welk deel van het blok het triggerpunt is,
	 * ingesteld via de "Wanneer begint het vastpinnen"-dropdown) plus de
	 * automatische sticky-header-correctie hierboven. Een functie i.p.v. een
	 * vaste string, zodat ScrollTrigger 'm bij elke refresh() herberekent
	 * (bv. na een resize, of als de sticky header van hoogte verandert).
	 */
	function pinStartFn( element ) {
		// "Verticaal centreren" wint van het pin-start-preset: ScrollTrigger's
		// eigen "center center" start-syntax laat het blok simpelweg pinnen op
		// de schermpositie waar het toevallig verticaal gecentreerd stond op het
		// moment dat de pin ingaat, en blijft daar staan — geen aparte
		// header-correctie nodig, het is niet tegen de bovenkant aan het pinnen.
		if ( element.getAttribute( 'data-szm-vertical-center' ) === 'true' ) {
			return function () {
				return 'center center';
			};
		}
		var preset = element.getAttribute( 'data-szm-pin-start' ) || 'top';
		return function () {
			var offset = getFixedHeaderOffset();
			var fraction = preset === 'center' ? 0.5 : preset === 'half' ? 0.25 : 0;
			return 'top ' + ( offset + window.innerHeight * fraction ) + 'px';
		};
	}

	/**
	 * "Blok erboven mee laten vastzetten" (data-szm-lock-heading): pint de
	 * direct voorafgaande sibling van het effect-blok in sync met diens eigen
	 * pin — zelfde trigger/start/end, dus ze gaan tegelijk aan en uit. Een
	 * losse ScrollTrigger met pinSpacing:false (de hoofd-ScrollTrigger van het
	 * effect zelf reserveert de scrollruimte al) i.p.v. de heading in dezelfde
	 * ScrollTrigger te proppen — zo blijft elk effect zijn eigen onafhankelijke
	 * trigger houden en hoeft er geen instelling op een ouder-element te komen
	 * (zie DECISIONS.md, afgewogen tegen precies dat alternatief).
	 */
	function lockHeadingIfRequested( container, triggerVars ) {
		if ( container.getAttribute( 'data-szm-lock-heading' ) !== 'true' ) {
			return;
		}
		var heading = container.previousElementSibling;
		if ( ! heading ) {
			return;
		}
		window.ScrollTrigger.create( {
			trigger: triggerVars.trigger || container,
			start: triggerVars.start,
			end: triggerVars.end,
			pin: heading,
			pinSpacing: false,
		} );
	}

	/**
	 * Zelfde correctie, maar altijd tegen het preset "top" — voor effecten
	 * (full-viewport scroll slides) die geen "wanneer begint pinnen"-keuze
	 * aanbieden omdat ze altijd exact bovenaan moeten beginnen om het scherm
	 * te vullen, maar nog wel onder een sticky header/adminbalk vandaan
	 * moeten blijven.
	 */
	function topPinStartFn() {
		return function () {
			return 'top ' + getFixedHeaderOffset() + 'px';
		};
	}

	/**
	 * Slider: applies to .szm-gsap-slider (core/columns). Each direct child
	 * column becomes a full-width slide; container gets prev/next arrows and
	 * dot navigation, with optional autoplay/loop.
	 */
	function initSliders() {
		var containers = document.querySelectorAll( '.szm-gsap-slider' );
		if ( ! containers.length ) {
			return;
		}

		containers.forEach( function ( container ) {
			var slides = Array.prototype.slice.call( container.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( slides.length < 2 ) {
				return;
			}

			var speed      = num( container.getAttribute( 'data-szm-slider-speed' ), 500 ) / 1000;
			var autoplay   = container.getAttribute( 'data-szm-slider-autoplay' ) === 'true';
			var autoplayMs = num( container.getAttribute( 'data-szm-slider-autoplay-speed' ), 4000 );
			var loop       = container.getAttribute( 'data-szm-slider-loop' ) !== 'false';
			var ease       = gsapEase( container );
			var index      = 0;
			var timer      = null;

			container.classList.add( 'szm-gsap-slider--ready' );
			// Defensief, boven op de CSS: WP core stapelt .wp-block-columns onder
			// 599px (flex-direction: column), wat de translateX-gestuurde slider
			// breekt. Inline + !important wint gegarandeerd, ongeacht thema-CSS.
			container.style.setProperty( 'display', 'flex', 'important' );
			container.style.setProperty( 'flex-direction', 'row', 'important' );
			container.style.setProperty( 'flex-wrap', 'nowrap', 'important' );
			// Zonder dit wint WP's eigen block-gap (Layout-instelling van het
			// Columns-blok, of een thema-default) van xPercent: elke slide zit
			// dan een beetje verder naar rechts dan de vorige, oplopend met de
			// index, omdat goTo() alleen met -100*index rekent en geen gap.
			container.style.setProperty( 'gap', '0', 'important' );
			slides.forEach( function ( slide ) {
				slide.classList.add( 'szm-gsap-slide' );
				slide.style.setProperty( 'flex', '0 0 100%', 'important' );
				slide.style.setProperty( 'width', '100%', 'important' );
			} );

			function goTo( target, animate ) {
				if ( target < 0 ) {
					target = loop ? slides.length - 1 : 0;
				}
				if ( target > slides.length - 1 ) {
					target = loop ? 0 : slides.length - 1;
				}

				index = target;
				var offset = -100 * index;

				if ( animate && ! prefersReducedMotion ) {
					gsap.to( container, { xPercent: offset, duration: speed, ease: ease } );
				} else {
					gsap.set( container, { xPercent: offset } );
				}

				dots.forEach( function ( dot, i ) {
					dot.classList.toggle( 'is-active', i === index );
				} );
			}

			function next() {
				goTo( index + 1, true );
			}
			function prev() {
				goTo( index - 1, true );
			}

			// Nav: prev/next arrows.
			var nav = document.createElement( 'div' );
			nav.className = 'szm-gsap-slider-nav';

			var prevBtn = document.createElement( 'button' );
			prevBtn.type = 'button';
			prevBtn.className = 'szm-gsap-slider-arrow szm-gsap-slider-prev';
			prevBtn.setAttribute( 'aria-label', 'Vorige' );
			prevBtn.innerHTML = '&#8249;';
			prevBtn.addEventListener( 'click', function () {
				stopAutoplay();
				prev();
			} );

			var nextBtn = document.createElement( 'button' );
			nextBtn.type = 'button';
			nextBtn.className = 'szm-gsap-slider-arrow szm-gsap-slider-next';
			nextBtn.setAttribute( 'aria-label', 'Volgende' );
			nextBtn.innerHTML = '&#8250;';
			nextBtn.addEventListener( 'click', function () {
				stopAutoplay();
				next();
			} );

			// Dots.
			var dotsWrap = document.createElement( 'div' );
			dotsWrap.className = 'szm-gsap-slider-dots';
			var dots = slides.map( function ( slide, i ) {
				var dot = document.createElement( 'button' );
				dot.type = 'button';
				dot.className = 'szm-gsap-slider-dot';
				dot.setAttribute( 'aria-label', 'Ga naar slide ' + ( i + 1 ) );
				dot.addEventListener( 'click', function () {
					stopAutoplay();
					goTo( i, true );
				} );
				dotsWrap.appendChild( dot );
				return dot;
			} );

			var wrapper = document.createElement( 'div' );
			wrapper.className = 'szm-gsap-slider-wrapper';
			container.parentNode.insertBefore( wrapper, container );
			wrapper.appendChild( container );
			wrapper.appendChild( prevBtn );
			wrapper.appendChild( nextBtn );
			wrapper.appendChild( dotsWrap );

			function startAutoplay() {
				if ( ! autoplay || prefersReducedMotion ) {
					return;
				}
				stopAutoplay();
				timer = window.setInterval( next, autoplayMs );
			}
			function stopAutoplay() {
				if ( timer ) {
					window.clearInterval( timer );
					timer = null;
				}
			}

			// Alleen bij echte hover, zelfde reden als bij de marquee: op touch kan
			// een synthetische mouseenter zonder mouseleave autoplay blijvend stoppen.
			if ( supportsHover ) {
				wrapper.addEventListener( 'mouseenter', stopAutoplay );
				wrapper.addEventListener( 'mouseleave', startAutoplay );
			}

			// Swipe: essentieel op mobiel/touch, waar er geen hover/pijltjes-gewoonte is.
			var touchStartX = null;
			wrapper.addEventListener( 'touchstart', function ( e ) {
				touchStartX = e.touches[ 0 ].clientX;
				stopAutoplay();
			}, { passive: true } );
			wrapper.addEventListener( 'touchend', function ( e ) {
				if ( touchStartX === null ) {
					return;
				}
				var deltaX = e.changedTouches[ 0 ].clientX - touchStartX;
				touchStartX = null;
				if ( Math.abs( deltaX ) < 40 ) {
					startAutoplay();
					return;
				}
				deltaX < 0 ? next() : prev();
			}, { passive: true } );

			goTo( 0, false );
			startAutoplay();
		} );
	}

	/**
	 * Sticky process steps: applies to .szm-gsap-process (core/columns).
	 * First direct column = sticky image/media side, second direct column =
	 * steps; each direct child block of that second column is one step,
	 * whose first element stays visible as the "header" and the rest
	 * collapses to height 0 as the next step scrolls into place — the whole
	 * block pins while that happens. Ported from studiozondermeer.nl's own
	 * hand-written theme GSAP into a reusable Inspector toggle. Desktop pins
	 * the whole block; mobile pins only the text column instead (image
	 * column has no room to stay beside it once columns stack), matching
	 * the original — decided once via window.innerWidth at init time, not
	 * with gsap.matchMedia(): matchMedia's own deferred-evaluation timing
	 * was measuring "top 80px" against the page's layout *before* later
	 * effects further down in initGsapEffects()'s call order (e.g.
	 * initHorizontalScroll()/initFullpage()) had inserted their own
	 * pin-spacers, even after an explicit ScrollTrigger.refresh() — every
	 * other pinned effect in this file (accordion/horizontal/fullpage/
	 * video-scrub) is matchMedia-free and doesn't have this problem.
	 */
	function initProcessSteps() {
		if ( prefersReducedMotion || ! window.ScrollTrigger ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-process' ).forEach( function ( container ) {
			var directChildren = Array.prototype.slice.call( container.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );
			var wpColumns = directChildren.filter( function ( child ) {
				return child.classList.contains( 'wp-block-column' );
			} );

			// Drie vormen: Columns-blok met 2+ kolommen (eerste = sticky visual,
			// tweede = stappen — het originele gedrag), Columns-blok met maar 1
			// kolom, of een Group-blok (geen kolommen — de directe kind-blokken
			// ZIJN de stappen). De laatste twee hebben geen aparte visual-kant.
			var imageSide = null;
			var textSide  = null;
			if ( wpColumns.length >= 2 ) {
				imageSide = wpColumns[ 0 ];
				textSide  = wpColumns[ 1 ];
			} else if ( wpColumns.length === 1 ) {
				textSide = wpColumns[ 0 ];
			} else {
				textSide = container;
			}

			var items = Array.prototype.slice.call( textSide.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( items.length < 2 ) {
				return;
			}

			container.classList.add( 'szm-gsap-process--ready' );

			var contents = items.map( function ( item ) {
				item.classList.add( 'szm-gsap-process-item' );
				var header = item.firstElementChild;
				if ( ! header ) {
					return null;
				}
				var content = document.createElement( 'div' );
				content.className = 'szm-gsap-process-content';
				Array.prototype.slice.call( item.children ).slice( 1 ).forEach( function ( node ) {
					content.appendChild( node );
				} );
				item.appendChild( content );
				return content;
			} );

			// Scroll distance the pin holds for: data-szm-scroll-length% of the
			// viewport height per step that has to collapse (user-configurable
			// "Scroll-afstand per stap" slider, default 100). Using a fixed
			// "+=Npx" formula instead of the original theme code's
			// "end: 'bottom bottom'" — that only gives a usable scrub range when
			// the *uncollapsed* content happens to be taller than one viewport,
			// so with shorter step text (the common case for arbitrary editor
			// content) it snapped shut almost instantly. Same fix pattern as
			// initFullpage()'s pin distance.
			var stepPercent     = num( container.getAttribute( 'data-szm-scroll-length' ), 100 );
			var scrollDistance  = '+=' + Math.max( 1, items.length - 1 ) * stepPercent + '%';

			var isMobile = window.innerWidth < 800;

			// Mobiel + split-kolommen: WP core stapelt de kolommen, dus pin de
			// tekstkolom zelf i.p.v. het hele blok en til 'm boven de (nu
			// volle-breedte, erachter liggende) afbeeldingskolom uit. Zonder
			// aparte visual-kant (1-koloms of Group) is dat niet nodig — er is
			// niets om achter weg te vallen, dus pin altijd gewoon de container.
			if ( isMobile && imageSide ) {
				gsap.set( textSide, { position: 'relative', zIndex: 10 } );
				gsap.set( imageSide, { zIndex: 1 } );
			}

			var pinTarget = ( isMobile && imageSide ) ? textSide : container;

			// Was hardcoded 'top 80px'/'top 40px' (een educated guess om onder
			// een sticky header te blijven) — nu de gebruikersinstelling
			// ("Wanneer begint het vastpinnen") plus de automatische
			// header/adminbalk-correctie, zie pinStartFn()/getFixedHeaderOffset().
			var startFn = pinStartFn( container );

			var tl = gsap.timeline( {
				scrollTrigger: {
					// Desktop (of geen aparte visual-kant) pint het hele blok;
					// mobiel + split-kolommen pint alleen de tekstkolom.
					trigger: pinTarget,
					start: startFn,
					end: scrollDistance,
					pin: true,
					// pinSpacing left at its default (true), unlike the ported
					// theme code: that original relied on "end: 'bottom bottom'"
					// (see scrollDistance above) so the page's own content
					// already provided the scroll room and no spacer was
					// needed. A fixed "+=N%" distance needs GSAP to actually
					// reserve that much real page space — pinSpacing:false
					// with a formula end left a blank void with nothing to
					// scroll into (confirmed visually, not just via metrics).
					scrub: 1,
					anticipatePin: 1,
					invalidateOnRefresh: true,
					refreshPriority: isMobile ? 1 : 0,
				},
			} );

			lockHeadingIfRequested( container, { trigger: pinTarget, start: startFn, end: scrollDistance } );

			items.forEach( function ( item, i ) {
				if ( i === items.length - 1 || ! contents[ i ] ) {
					return;
				}
				tl.to( item, { marginBottom: 0, duration: 1, ease: 'none' } )
					.to( contents[ i ], { height: 0, duration: 1, ease: 'none' }, '-=0.3' );
			} );
		} );
	}

	/**
	 * Accordion: applies to .szm-gsap-accordion (core/group). Each direct
	 * child is one panel: its first child element is the clickable trigger,
	 * the rest of its content collapses/expands with a GSAP height tween.
	 */
	function initAccordions() {
		var containers = document.querySelectorAll( '.szm-gsap-accordion' );
		if ( ! containers.length ) {
			return;
		}

		containers.forEach( function ( container ) {
			var items = Array.prototype.slice.call( container.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( ! items.length ) {
				return;
			}

			var speed        = num( container.getAttribute( 'data-szm-accordion-speed' ), 400 ) / 1000;
			var allowMultiple = container.getAttribute( 'data-szm-accordion-multiple' ) === 'true';
			var defaultOpen   = num( container.getAttribute( 'data-szm-accordion-default-open' ), -1 );
			var ease          = gsapEase( container );

			container.classList.add( 'szm-gsap-accordion--ready' );

			var panels = items.map( function ( item, i ) {
				var trigger = item.firstElementChild;
				if ( ! trigger ) {
					return null;
				}

				var content = document.createElement( 'div' );
				content.className = 'szm-gsap-accordion-content';
				var rest = Array.prototype.slice.call( item.children ).slice( 1 );
				rest.forEach( function ( node ) {
					content.appendChild( node );
				} );
				item.appendChild( content );

				item.classList.add( 'szm-gsap-accordion-item' );
				trigger.classList.add( 'szm-gsap-accordion-trigger' );
				trigger.setAttribute( 'role', 'button' );
				trigger.setAttribute( 'tabindex', '0' );
				trigger.setAttribute( 'aria-expanded', 'false' );

				var isOpen = i === defaultOpen;
				gsap.set( content, { height: isOpen ? 'auto' : 0, overflow: 'hidden' } );
				item.classList.toggle( 'is-open', isOpen );
				trigger.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );

				var panel = { item: item, trigger: trigger, content: content, open: isOpen };

				function toggle() {
					if ( ! allowMultiple && ! panel.open ) {
						panels.forEach( function ( other ) {
							if ( other && other !== panel && other.open ) {
								closePanel( other );
							}
						} );
					}
					panel.open ? closePanel( panel ) : openPanel( panel );
				}

				trigger.addEventListener( 'click', toggle );
				trigger.addEventListener( 'keydown', function ( e ) {
					if ( e.key === 'Enter' || e.key === ' ' ) {
						e.preventDefault();
						toggle();
					}
				} );

				return panel;
			} ).filter( Boolean );

			function openPanel( panel ) {
				panel.open = true;
				panel.item.classList.add( 'is-open' );
				panel.trigger.setAttribute( 'aria-expanded', 'true' );
				if ( prefersReducedMotion ) {
					gsap.set( panel.content, { height: 'auto' } );
					return;
				}
				gsap.to( panel.content, { height: 'auto', duration: speed, ease: ease } );
			}

			function closePanel( panel ) {
				panel.open = false;
				panel.item.classList.remove( 'is-open' );
				panel.trigger.setAttribute( 'aria-expanded', 'false' );
				if ( prefersReducedMotion ) {
					gsap.set( panel.content, { height: 0 } );
					return;
				}
				gsap.to( panel.content, { height: 0, duration: speed, ease: ease } );
			}
		} );
	}

	/**
	 * Video effects: applies to Video/Cover block wrappers carrying
	 * .szm-gsap-video-parallax / -reveal / -play-on-scroll.
	 */
	function initVideoEffects() {
		if ( prefersReducedMotion || ! window.ScrollTrigger ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-video-parallax' ).forEach( function ( wrapper ) {
			var video = wrapper.querySelector( 'video' );
			if ( ! video ) {
				return;
			}
			var intensity = num( wrapper.getAttribute( 'data-szm-video-speed' ), 20 );
			gsap.fromTo(
				video,
				{ yPercent: -intensity },
				{
					yPercent: intensity,
					ease: 'none',
					scrollTrigger: {
						trigger: wrapper,
						start: 'top bottom',
						end: 'bottom top',
						scrub: true,
					},
				}
			);
		} );

		document.querySelectorAll( '.szm-gsap-video-reveal' ).forEach( function ( wrapper ) {
			var video = wrapper.querySelector( 'video' );
			if ( ! video ) {
				return;
			}
			// Zonder dit blijft de video op sommige mobiele browsers een zwart vlak
			// dat "onthult" i.p.v. een echt beeld, omdat hij nooit heeft afgespeeld —
			// zie primeVideo() hierboven.
			primeVideo( video );
			var speed = num( wrapper.getAttribute( 'data-szm-video-speed' ), 800 ) / 1000;
			gsap.fromTo(
				video,
				{ autoAlpha: 0, scale: 1.08 },
				{
					autoAlpha: 1,
					scale: 1,
					duration: speed,
					ease: gsapEase( wrapper ),
					scrollTrigger: {
						trigger: wrapper,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				}
			);
		} );

		document.querySelectorAll( '.szm-gsap-video-play-on-scroll' ).forEach( function ( wrapper ) {
			var video = wrapper.querySelector( 'video' );
			if ( ! video ) {
				return;
			}
			window.ScrollTrigger.create( {
				trigger: wrapper,
				start: 'top 90%',
				end: 'bottom 10%',
				onEnter: function () {
					video.play();
				},
				onLeave: function () {
					video.pause();
				},
				onEnterBack: function () {
					video.play();
				},
				onLeaveBack: function () {
					video.pause();
				},
			} );
		} );

		// Scrub: video pint vast en de afspeelpositie volgt de scrollpositie 1-op-1,
		// als een filmstrook die je met de muis/vinger doorheen scrolt (Apple-stijl).
		document.querySelectorAll( '.szm-gsap-video-scrub' ).forEach( function ( wrapper ) {
			var video = wrapper.querySelector( 'video' );
			if ( ! video ) {
				return;
			}
			// data-szm-video-speed is hier de scrollafstand als % van de viewporthoogte
			// (bv. 300 = 3x schermhoogte scrollen om de hele video door te lopen).
			var distanceVh = num( wrapper.getAttribute( 'data-szm-video-speed' ), 200 ) / 100;

			// Zonder dit blijft currentTime-scrubbing op sommige mobiele browsers
			// zonder effect zichtbaar — de decoder wordt pas actief na een echte
			// play(), zie primeVideo() hierboven.
			primeVideo( video );

			function create() {
				if ( ! video.duration || isNaN( video.duration ) ) {
					return;
				}
				var startFn = pinStartFn( wrapper );
				var endFn   = function () {
					return '+=' + ( window.innerHeight * distanceVh );
				};
				window.ScrollTrigger.create( {
					trigger: wrapper,
					start: startFn,
					end: endFn,
					pin: true,
					scrub: true,
					invalidateOnRefresh: true,
					onUpdate: function ( self ) {
						video.currentTime = self.progress * video.duration;
					},
				} );

				lockHeadingIfRequested( wrapper, { trigger: wrapper, start: startFn, end: endFn } );

				// This pin's spacer inserts real extra page height, but it's
				// often created late — after "loadedmetadata" fires, which can
				// be after ScrollTrigger's own initial page-load refresh already
				// cached every OTHER trigger's start/end pixel positions. Any
				// trigger further down the page (e.g. a later effect on this
				// same page) would then stay pinned to its now-stale position,
				// pinning far too early relative to where it actually now sits.
				// A refresh here recomputes everyone once this pin's real height
				// is actually in the document.
				window.ScrollTrigger.refresh();
			}

			if ( video.readyState >= 1 ) {
				create();
			} else {
				video.addEventListener( 'loadedmetadata', create, { once: true } );
			}
		} );
	}

	/**
	 * Text reveal: applies to .szm-gsap-text-{chars|words|lines} (core/heading,
	 * core/paragraph). Splits the text with SplitText and staggers each unit
	 * in (fade + slide-up) as it scrolls into view.
	 */
	var LOOP_DELAY_SECONDS = { short: 15, normal: 30, long: 60 };

	function loopDelaySeconds( el ) {
		var preset = el.getAttribute( 'data-szm-loop-delay' ) || 'normal';
		return LOOP_DELAY_SECONDS[ preset ] || LOOP_DELAY_SECONDS.normal;
	}

	/**
	 * "Na een tijdje herhalen" (data-szm-loop, aan by default): een losse,
	 * pauzeerbare timeline die pas ná de eerste (scroll-getriggerde) reveal
	 * begint en alleen loopt zolang het blok daadwerkelijk in beeld is —
	 * anders zou een blok ver buiten beeld onnodig door blijven animeren.
	 * IntersectionObserver i.p.v. nog een ScrollTrigger: hoeft niet mee te
	 * doen aan pin/scrub-berekeningen, alleen zichtbaarheid.
	 */
	function attachVisibilityLoop( el, timeline ) {
		if ( ! window.IntersectionObserver ) {
			timeline.play();
			return;
		}
		var observer = new window.IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					timeline.play();
				} else {
					timeline.pause();
				}
			} );
		}, { threshold: 0.1 } );
		observer.observe( el );
	}

	function initTextReveal() {
		if ( ! window.SplitText ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-text' ).forEach( function ( el ) {
			var type = [ 'chars', 'words', 'lines' ].filter( function ( t ) {
				return el.classList.contains( 'szm-gsap-text-' + t );
			} )[ 0 ];
			if ( ! type ) {
				return;
			}

			var speed   = num( el.getAttribute( 'data-szm-text-speed' ), 600 ) / 1000;
			var stagger = num( el.getAttribute( 'data-szm-text-stagger' ), 30 ) / 1000;
			var ease    = gsapEase( el );
			var loop    = el.getAttribute( 'data-szm-loop' ) !== 'false';

			if ( prefersReducedMotion ) {
				return;
			}

			var split = new window.SplitText( el, { type: type, mask: type } );
			var units = split[ type ]; // split.chars / split.words / split.lines

			gsap.set( units, { yPercent: 110, opacity: 0 } );
			gsap.to( units, {
				yPercent: 0,
				opacity: 1,
				duration: speed,
				stagger: stagger,
				ease: ease,
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
				},
				onComplete: function () {
					if ( ! loop ) {
						return;
					}
					var loopTl = gsap.timeline( { repeat: -1, delay: loopDelaySeconds( el ), repeatDelay: loopDelaySeconds( el ), paused: true } )
						.to( units, { yPercent: 110, opacity: 0, duration: speed, stagger: stagger, ease: ease } )
						.to( units, { yPercent: 0, opacity: 1, duration: speed, stagger: stagger, ease: ease } );
					attachVisibilityLoop( el, loopTl );
				},
			} );
		} );
	}

	/**
	 * Animated counter: applies to .szm-gsap-counter (core/heading). Finds the
	 * first number in the heading's text and counts up from 0 to it, keeping
	 * any surrounding text (e.g. "500+ klanten", "€ 250") intact.
	 */
	function initCounters() {
		document.querySelectorAll( '.szm-gsap-counter' ).forEach( function ( el ) {
			var text  = el.textContent;
			var match = text.match( /[\d.,]+/ );
			if ( ! match ) {
				return;
			}

			var raw    = match[ 0 ];
			var target = parseFloat( raw.replace( /\./g, '' ).replace( ',', '.' ) );
			if ( isNaN( target ) ) {
				return;
			}

			var before   = text.slice( 0, match.index );
			var after    = text.slice( match.index + raw.length );
			var speed    = num( el.getAttribute( 'data-szm-counter-speed' ), 1500 ) / 1000;
			var decimals = ( raw.split( ',' )[ 1 ] || '' ).length;
			var ease     = gsapEase( el );
			var loop     = el.getAttribute( 'data-szm-loop' ) !== 'false';

			if ( prefersReducedMotion ) {
				return;
			}

			var counter = { value: 0 };
			function render() {
				var formatted = decimals ? counter.value.toFixed( decimals ).replace( '.', ',' ) : Math.round( counter.value ).toString();
				el.textContent = before + formatted + after;
			}

			gsap.to( counter, {
				value: target,
				duration: speed,
				ease: ease,
				onUpdate: render,
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
					once: true,
				},
				onComplete: function () {
					if ( ! loop ) {
						return;
					}
					// "Animeer terug naar 0" i.p.v. instant resetten: dezelfde
					// stijl als de eerste keer, alleen dan omgekeerd.
					var loopTl = gsap.timeline( { repeat: -1, delay: loopDelaySeconds( el ), repeatDelay: loopDelaySeconds( el ), paused: true } )
						.to( counter, { value: 0, duration: speed, ease: ease, onUpdate: render } )
						.to( counter, { value: target, duration: speed, ease: ease, onUpdate: render } );
					attachVisibilityLoop( el, loopTl );
				},
			} );
		} );
	}

	/**
	 * Magnetic button: applies to .szm-gsap-magnetic (core/button). The button
	 * pulls toward the cursor while the mouse is inside its bounds, using
	 * gsap.quickTo for a smooth, cheap-to-update follow.
	 */
	function initMagneticButtons() {
		if ( prefersReducedMotion ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-magnetic' ).forEach( function ( wrapper ) {
			var target = wrapper.querySelector( '.wp-block-button__link' ) || wrapper;
			var strength = num( wrapper.getAttribute( 'data-szm-magnetic-strength' ), 40 );
			var ease = gsapEase( wrapper );

			var xTo = gsap.quickTo( target, 'x', { duration: 0.3, ease: ease } );
			var yTo = gsap.quickTo( target, 'y', { duration: 0.3, ease: ease } );

			wrapper.addEventListener( 'mousemove', function ( e ) {
				var rect = wrapper.getBoundingClientRect();
				var relX = ( e.clientX - rect.left - rect.width / 2 ) / ( rect.width / 2 );
				var relY = ( e.clientY - rect.top - rect.height / 2 ) / ( rect.height / 2 );
				xTo( relX * strength );
				yTo( relY * strength );
			} );

			wrapper.addEventListener( 'mouseleave', function () {
				xTo( 0 );
				yTo( 0 );
			} );

			// Touch-alternatief: er is geen cursorpositie om te volgen op een
			// touchscreen, dus "volgen" kan niet 1-op-1 vertalen. In plaats
			// daarvan geeft een tik een korte "pols"-tik (indrukken + terugveren)
			// als tactiele feedback die bij het magnetische gevoel past.
			wrapper.addEventListener( 'touchstart', function () {
				gsap.timeline()
					.to( target, { scale: 0.94, duration: 0.12, ease: 'power2.out' } )
					.to( target, { scale: 1, x: 0, y: 0, duration: 0.28, ease: 'elastic.out(1, 0.5)' } );
			}, { passive: true } );
		} );
	}

	/**
	 * Horizontal scroll: applies to .szm-gsap-horizontal (core/group). Pins the
	 * group in place and translates its direct children sideways as the page
	 * scrolls vertically past it — the classic awwwards horizontal-section.
	 */
	function initHorizontalScroll() {
		if ( prefersReducedMotion || ! window.ScrollTrigger ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-horizontal' ).forEach( function ( container ) {
			var children = Array.prototype.slice.call( container.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( children.length < 2 ) {
				return;
			}

			container.classList.add( 'szm-gsap-horizontal--ready' );

			var mode    = container.getAttribute( 'data-szm-horizontal-mode' ) === 'stack' ? 'stack' : 'scroll';
			var startFn = pinStartFn( container );

			// "Stapelen": geen zijwaartse beweging — panelen liggen absoluut op
			// elkaar (zelfde techniek als de fullpage-stack-overgang hieronder)
			// en het volgende dekt het vorige af naarmate er verticaal gescrold
			// wordt. Container krijgt de hoogte van het hoogste paneel, gemeten
			// vóór het absoluut positioneren — anders zakt hij in elkaar, want
			// absolute kinderen geven geen hoogte door aan hun ouder.
			if ( mode === 'stack' ) {
				var maxHeight = 0;
				children.forEach( function ( child ) {
					maxHeight = Math.max( maxHeight, child.getBoundingClientRect().height );
				} );

				container.style.position = 'relative';
				container.style.height   = maxHeight + 'px';

				children.forEach( function ( child, i ) {
					child.classList.add( 'szm-gsap-horizontal-panel', 'szm-gsap-horizontal-panel--stacked' );
					gsap.set( child, {
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						zIndex: i,
						opacity: 1,
						yPercent: i === 0 ? 0 : 100,
					} );
				} );

				var stackEnd = '+=' + ( children.length - 1 ) * 100 + '%';
				var stackTl = gsap.timeline( {
					scrollTrigger: {
						trigger: container,
						start: startFn,
						end: stackEnd,
						scrub: true,
						pin: true,
						invalidateOnRefresh: true,
					},
				} );

				children.forEach( function ( panel, i ) {
					if ( i === children.length - 1 ) {
						return;
					}
					stackTl.to( panel, { scale: 0.92, opacity: 0.6, duration: 1, ease: 'none' }, i )
						.to( children[ i + 1 ], { yPercent: 0, duration: 1, ease: 'none' }, i );
				} );

				lockHeadingIfRequested( container, { trigger: container, start: startFn, end: stackEnd } );
				return;
			}

			var track = document.createElement( 'div' );
			track.className = 'szm-gsap-horizontal-track';
			children.forEach( function ( child ) {
				child.classList.add( 'szm-gsap-horizontal-panel' );
				track.appendChild( child );
			} );
			container.appendChild( track );

			var scrollDistance = function () {
				return track.scrollWidth - container.clientWidth;
			};
			var horizontalEnd = function () {
				return '+=' + scrollDistance();
			};

			gsap.to( track, {
				x: function () {
					return -scrollDistance();
				},
				ease: 'none',
				scrollTrigger: {
					trigger: container,
					start: startFn,
					end: horizontalEnd,
					scrub: true,
					pin: true,
					invalidateOnRefresh: true,
				},
			} );

			lockHeadingIfRequested( container, { trigger: container, start: startFn, end: horizontalEnd } );
		} );
	}

	/**
	 * Marquee: applies to .szm-gsap-marquee (core/list). Duplicates the list
	 * items so the track can loop seamlessly, then scrolls it endlessly left
	 * or right at a constant speed.
	 */
	function initMarquee() {
		document.querySelectorAll( '.szm-gsap-marquee' ).forEach( function ( list ) {
			var originalItems = Array.prototype.slice.call( list.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( ! originalItems.length ) {
				return;
			}

			var speedSeconds = num( list.getAttribute( 'data-szm-marquee-speed' ), 30 );
			var direction    = list.getAttribute( 'data-szm-marquee-direction' ) === 'right' ? 1 : -1;

			list.classList.add( 'szm-gsap-marquee--ready' );

			var tween    = null;
			var setWidth = 0;

			function clearClones() {
				Array.prototype.slice.call( list.children ).forEach( function ( child ) {
					if ( originalItems.indexOf( child ) === -1 ) {
						list.removeChild( child );
					}
				} );
			}

			// (Her)bouwt de track: meet de echte breedte van één set (incl. gap),
			// dupliceert daarna zo vaak als nodig tot er minimaal 2 viewport-
			// breedtes + 1 extra set aan content staat. Met maar 1 duplicaat
			// (de oude aanpak) was er een zichtbaar gat/sprong zodra één set
			// smaller was dan het scherm, of zodra een laat ladende afbeelding
			// de breedte alsnog veranderde — vandaar ook de resize/load-hooks
			// hieronder die dit opnieuw aanroepen.
			function buildTrack() {
				if ( tween ) {
					tween.kill();
					tween = null;
				}
				clearClones();

				originalItems.forEach( function ( item ) {
					list.appendChild( item.cloneNode( true ) );
				} );
				var firstOriginal = originalItems[ 0 ];
				var firstClone    = list.children[ originalItems.length ];
				setWidth = firstClone.getBoundingClientRect().left - firstOriginal.getBoundingClientRect().left;
				if ( ! setWidth || setWidth <= 0 ) {
					setWidth = list.scrollWidth / 2;
				}

				var viewportWidth = list.parentElement ? list.parentElement.clientWidth : window.innerWidth;
				var minWidth      = viewportWidth * 2 + setWidth;
				var guard         = 0;
				while ( list.scrollWidth < minWidth && guard < 20 ) {
					originalItems.forEach( function ( item ) {
						list.appendChild( item.cloneNode( true ) );
					} );
					guard++;
				}

				if ( prefersReducedMotion ) {
					return;
				}

				gsap.set( list, { x: direction === -1 ? 0 : -setWidth } );
				tween = gsap.to( list, {
					x: direction === -1 ? -setWidth : 0,
					duration: speedSeconds,
					ease: 'none',
					repeat: -1,
				} );
			}

			buildTrack();

			var images = list.querySelectorAll( 'img' );
			images.forEach( function ( img ) {
				if ( ! img.complete ) {
					img.addEventListener( 'load', buildTrack, { once: true } );
				}
			} );

			var resizeTimer = null;
			window.addEventListener( 'resize', function () {
				window.clearTimeout( resizeTimer );
				resizeTimer = window.setTimeout( buildTrack, 200 );
			} );

			if ( prefersReducedMotion ) {
				return;
			}

			// Pause on hover so visitors can actually read a fast-moving marquee.
			// Alleen bij echte hover: op touch-devices kan scrollen óver de marquee
			// een synthetische "mouseenter" triggeren zonder bijpassende "mouseleave"
			// (voor :hover-CSS), waardoor de marquee blijvend gepauzeerd bleef staan —
			// leek dan alsof "hij niet werkt". Zie supportsHover hierboven.
			if ( supportsHover ) {
				list.addEventListener( 'mouseenter', function () {
					if ( tween ) {
						tween.pause();
					}
				} );
				list.addEventListener( 'mouseleave', function () {
					if ( tween ) {
						tween.resume();
					}
				} );
			} else {
				// Touch-alternatief: hoveren bestaat niet, dus een tik zet
				// pauzeren/doorlopen om (in plaats van te pauzeren zolang de
				// vinger op het scherm staat, wat scrollen-over-de-marquee zou
				// blokkeren). Alleen een échte tik telt — een scroll-gebaar
				// over de marquee (vinger beweegt >10px) telt niet mee.
				var touchStart = null;
				list.addEventListener( 'touchstart', function ( e ) {
					var t = e.touches[ 0 ];
					touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
				}, { passive: true } );
				list.addEventListener( 'touchend', function ( e ) {
					if ( ! touchStart || ! tween ) {
						return;
					}
					var t = e.changedTouches[ 0 ];
					var moved = Math.abs( t.clientX - touchStart.x ) + Math.abs( t.clientY - touchStart.y );
					var duration = Date.now() - touchStart.time;
					touchStart = null;
					if ( moved > 10 || duration > 500 ) {
						return;
					}
					tween.paused() ? tween.resume() : tween.pause();
				}, { passive: true } );
			}
		} );
	}

	/**
	 * Full-viewport scroll slides: applies to .szm-gsap-fullpage (core/group).
	 * Each direct child becomes a full-viewport panel; the group pins itself
	 * and crossfades from one panel to the next as the visitor scrolls, like
	 * a slide deck (the classic Apple/awwwards "fullpage" scroll section).
	 */
	function initFullpage() {
		if ( prefersReducedMotion || ! window.ScrollTrigger ) {
			return;
		}

		document.querySelectorAll( '.szm-gsap-fullpage' ).forEach( function ( container ) {
			var panels = Array.prototype.slice.call( container.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( panels.length < 2 ) {
				return;
			}

			container.classList.add( 'szm-gsap-fullpage--ready' );

			// Overgangsstijl (dropdown): fade (oud gedrag, default), stack,
			// slideup of zoom. z-index loopt nu altijd oplopend met i (later
			// paneel bovenop) — bij fade maakt de volgorde niets uit (volledig
			// opaak/transparant), maar stack/slideup/zoom hebben het latere
			// paneel wél zichtbaar boven het vorige nodig om af te dekken.
			var transition = container.getAttribute( 'data-szm-fullpage-transition' ) || 'fade';

			panels.forEach( function ( panel, i ) {
				panel.classList.add( 'szm-gsap-fullpage-panel' );
				var state = { zIndex: i };
				if ( transition === 'fade' ) {
					state.opacity = i === 0 ? 1 : 0;
				} else if ( transition === 'zoom' ) {
					state.opacity = i === 0 ? 1 : 0;
					state.scale   = i === 0 ? 1 : 1.15;
				} else {
					// slideup / stack: altijd zichtbaar, alleen y-positie verschilt.
					state.opacity  = 1;
					state.yPercent = i === 0 ? 0 : 100;
				}
				gsap.set( panel, state );
			} );

			var startFn = topPinStartFn();
			var endValue = '+=' + ( panels.length - 1 ) * 100 + '%';

			var tl = gsap.timeline( {
				scrollTrigger: {
					trigger: container,
					// Geen gebruikers-preset (altijd top): elk panel moet het hele
					// scherm vullen, dus pinnen kan alleen exact bovenaan beginnen.
					// topPinStartFn() corrigeert nog wel automatisch voor een sticky
					// header/adminbalk, zie getFixedHeaderOffset().
					start: startFn,
					end: endValue,
					scrub: true,
					pin: true,
					invalidateOnRefresh: true,
				},
			} );

			panels.forEach( function ( panel, i ) {
				if ( i === panels.length - 1 ) {
					return;
				}
				var next = panels[ i + 1 ];
				if ( transition === 'fade' ) {
					tl.to( panel, { opacity: 0, duration: 1, ease: 'none' }, i )
						.to( next, { opacity: 1, duration: 1, ease: 'none' }, i );
				} else if ( transition === 'zoom' ) {
					tl.to( panel, { opacity: 0, scale: 0.9, duration: 1, ease: 'none' }, i )
						.to( next, { opacity: 1, scale: 1, duration: 1, ease: 'none' }, i );
				} else if ( transition === 'stack' ) {
					tl.to( panel, { scale: 0.92, opacity: 0.6, duration: 1, ease: 'none' }, i )
						.to( next, { yPercent: 0, duration: 1, ease: 'none' }, i );
				} else {
					// slideup
					tl.to( next, { yPercent: 0, duration: 1, ease: 'none' }, i );
				}
			} );

			lockHeadingIfRequested( container, { trigger: container, start: startFn, end: endValue } );
		} );
	}

	function init() {
		initSliders();
		initProcessSteps();
		initAccordions();
		initHorizontalScroll();
		initFullpage();
		initVideoEffects();
		initTextReveal();
		initCounters();
		initMagneticButtons();
		initMarquee();

		// Every init*Above creates its ScrollTrigger pins/positions as soon as
		// it runs — but a pin earlier in *this list* can sit later in the
		// *document* than one created after it (e.g. initProcessSteps() runs
		// before initHorizontalScroll()/initFullpage(), yet a process section
		// can come after a horizontal/fullpage section on the page). Each
		// earlier-in-the-DOM pin inserts real extra page height once it's
		// created; anything whose position was measured before that already
		// happened ends up stale by that much, pinning far too early. One
		// refresh here, once every synchronous effect above has run, forces
		// GSAP to recompute every trigger's start/end against the final,
		// fully-settled layout. (Async pins — currently just video-scrub,
		// which waits on the video's "loadedmetadata" — need their own
		// follow-up refresh after they actually get created; see there.)
		if ( window.ScrollTrigger ) {
			window.ScrollTrigger.refresh();
		}

		// Mobiel: adresbalk in/uit beeld en rotatie veranderen de viewporthoogte
		// zonder dat de content zelf verandert — ScrollTrigger moet dan opnieuw
		// zijn start/end-posities berekenen (pin-afstanden, "+=Npx" eindpunten).
		var refreshTimer = null;
		if ( window.ScrollTrigger ) {
			window.addEventListener( 'resize', function () {
				window.clearTimeout( refreshTimer );
				refreshTimer = window.setTimeout( function () {
					window.ScrollTrigger.refresh();
				}, 200 );
			} );
			window.addEventListener( 'orientationchange', function () {
				window.setTimeout( function () {
					window.ScrollTrigger.refresh();
				}, 300 );
			} );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
