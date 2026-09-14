/**
 * SZM Hover Animations — GSAP module.
 *
 * Ten GSAP-powered behaviours, purely driven by data-attributes that
 * assets/editor.js writes onto the saved block markup — no new blocks:
 * - Slider: turns a Columns block's columns into a swipeable/autoplay slider.
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
			var index      = 0;
			var timer      = null;

			container.classList.add( 'szm-gsap-slider--ready' );
			// Defensief, boven op de CSS: WP core stapelt .wp-block-columns onder
			// 599px (flex-direction: column), wat de translateX-gestuurde slider
			// breekt. Inline + !important wint gegarandeerd, ongeacht thema-CSS.
			container.style.setProperty( 'display', 'flex', 'important' );
			container.style.setProperty( 'flex-direction', 'row', 'important' );
			container.style.setProperty( 'flex-wrap', 'nowrap', 'important' );
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
					gsap.to( container, { xPercent: offset, duration: speed, ease: 'power2.out' } );
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
				gsap.to( panel.content, { height: 'auto', duration: speed, ease: 'power1.out' } );
			}

			function closePanel( panel ) {
				panel.open = false;
				panel.item.classList.remove( 'is-open' );
				panel.trigger.setAttribute( 'aria-expanded', 'false' );
				if ( prefersReducedMotion ) {
					gsap.set( panel.content, { height: 0 } );
					return;
				}
				gsap.to( panel.content, { height: 0, duration: speed, ease: 'power1.in' } );
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
					ease: 'power2.out',
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
				window.ScrollTrigger.create( {
					trigger: wrapper,
					start: 'top top',
					end: function () {
						return '+=' + ( window.innerHeight * distanceVh );
					},
					pin: true,
					scrub: true,
					invalidateOnRefresh: true,
					onUpdate: function ( self ) {
						video.currentTime = self.progress * video.duration;
					},
				} );
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
				ease: 'power3.out',
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
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

			var before = text.slice( 0, match.index );
			var after  = text.slice( match.index + raw.length );
			var speed  = num( el.getAttribute( 'data-szm-counter-speed' ), 1500 ) / 1000;
			var decimals = ( raw.split( ',' )[ 1 ] || '' ).length;

			if ( prefersReducedMotion ) {
				return;
			}

			var counter = { value: 0 };
			gsap.to( counter, {
				value: target,
				duration: speed,
				ease: 'power1.out',
				onUpdate: function () {
					var formatted = decimals ? counter.value.toFixed( decimals ).replace( '.', ',' ) : Math.round( counter.value ).toString();
					el.textContent = before + formatted + after;
				},
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					toggleActions: 'play none none none',
					once: true,
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

			var xTo = gsap.quickTo( target, 'x', { duration: 0.3, ease: 'power3' } );
			var yTo = gsap.quickTo( target, 'y', { duration: 0.3, ease: 'power3' } );

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

			gsap.to( track, {
				x: function () {
					return -scrollDistance();
				},
				ease: 'none',
				scrollTrigger: {
					trigger: container,
					start: 'top top',
					end: function () {
						return '+=' + scrollDistance();
					},
					scrub: true,
					pin: true,
					invalidateOnRefresh: true,
				},
			} );
		} );
	}

	/**
	 * Marquee: applies to .szm-gsap-marquee (core/list). Duplicates the list
	 * items so the track can loop seamlessly, then scrolls it endlessly left
	 * or right at a constant speed.
	 */
	function initMarquee() {
		document.querySelectorAll( '.szm-gsap-marquee' ).forEach( function ( list ) {
			var items = Array.prototype.slice.call( list.children ).filter( function ( child ) {
				return child.nodeType === 1;
			} );

			if ( ! items.length ) {
				return;
			}

			var speedSeconds = num( list.getAttribute( 'data-szm-marquee-speed' ), 30 );
			var direction    = list.getAttribute( 'data-szm-marquee-direction' ) === 'right' ? 1 : -1;

			list.classList.add( 'szm-gsap-marquee--ready' );

			// Duplicate the item set once so the track can wrap seamlessly.
			items.forEach( function ( item ) {
				list.appendChild( item.cloneNode( true ) );
			} );

			if ( prefersReducedMotion ) {
				return;
			}

			var totalWidth = list.scrollWidth / 2;
			var tween = gsap.fromTo( list, { x: direction === -1 ? 0 : -totalWidth }, {
				x: direction === -1 ? -totalWidth : 0,
				duration: speedSeconds,
				ease: 'none',
				repeat: -1,
			} );

			// Pause on hover so visitors can actually read a fast-moving marquee.
			// Alleen bij echte hover: op touch-devices kan scrollen óver de marquee
			// een synthetische "mouseenter" triggeren zonder bijpassende "mouseleave"
			// (voor :hover-CSS), waardoor de marquee blijvend gepauzeerd bleef staan —
			// leek dan alsof "hij niet werkt". Zie supportsHover hierboven.
			if ( supportsHover ) {
				list.addEventListener( 'mouseenter', function () {
					tween.pause();
				} );
				list.addEventListener( 'mouseleave', function () {
					tween.resume();
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
					if ( ! touchStart ) {
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
			panels.forEach( function ( panel, i ) {
				panel.classList.add( 'szm-gsap-fullpage-panel' );
				gsap.set( panel, { opacity: i === 0 ? 1 : 0, zIndex: panels.length - i } );
			} );

			var tl = gsap.timeline( {
				scrollTrigger: {
					trigger: container,
					start: 'top top',
					end: '+=' + ( panels.length - 1 ) * 100 + '%',
					scrub: true,
					pin: true,
					invalidateOnRefresh: true,
				},
			} );

			panels.forEach( function ( panel, i ) {
				if ( i === panels.length - 1 ) {
					return;
				}
				tl.to( panel, { opacity: 0, duration: 1 }, i )
					.to( panels[ i + 1 ], { opacity: 1, duration: 1 }, i );
			} );
		} );
	}

	function init() {
		initSliders();
		initAccordions();
		initHorizontalScroll();
		initFullpage();
		initVideoEffects();
		initTextReveal();
		initCounters();
		initMagneticButtons();
		initMarquee();

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
