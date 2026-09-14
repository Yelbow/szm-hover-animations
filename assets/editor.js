( function ( wp, settings ) {
	if ( ! wp || ! settings ) {
		return;
	}

	var addFilter               = wp.hooks.addFilter;
	var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
	var Fragment                = wp.element.Fragment;
	var el                      = wp.element.createElement;
	var useEffect               = wp.element.useEffect;
	var useSelect               = wp.data.useSelect;
	var InspectorControls       = wp.blockEditor.InspectorControls;
	var PanelBody               = wp.components.PanelBody;
	var SelectControl           = wp.components.SelectControl;
	var RangeControl            = wp.components.RangeControl;
	var ToggleControl           = wp.components.ToggleControl;
	var __                      = wp.i18n.__;

	var HOVER_BLOCKS       = settings.blocks || [];
	var ENTRANCE_BLOCKS    = settings.entranceBlocks || [];
	var HOVER_OPTIONS_MAP  = settings.options || {};
	var ENTRANCE_OPTIONS_MAP = settings.entranceOptions || {};

	// GSAP-module: geen nieuwe blokken, gedrag toegevoegd aan bestaande blokken.
	var GSAP_SLIDER_BLOCKS    = settings.gsapSliderBlocks || [];
	var GSAP_ACCORDION_BLOCKS = settings.gsapAccordionBlocks || [];
	var GSAP_VIDEO_BLOCKS     = settings.gsapVideoBlocks || [];
	var GSAP_VIDEO_OPTIONS_MAP = settings.gsapVideoOptions || {};
	var GSAP_TEXT_BLOCKS      = settings.gsapTextBlocks || [];
	var GSAP_TEXT_OPTIONS_MAP = settings.gsapTextOptions || {};
	var GSAP_COUNTER_BLOCKS   = settings.gsapCounterBlocks || [];
	var GSAP_MAGNETIC_BLOCKS  = settings.gsapMagneticBlocks || [];
	var GSAP_HORIZONTAL_BLOCKS = settings.gsapHorizontalBlocks || [];
	var GSAP_FULLPAGE_BLOCKS  = settings.gsapFullpageBlocks || [];
	var GSAP_MARQUEE_BLOCKS   = settings.gsapMarqueeBlocks || [];

	var DEFAULT_HOVER_SPEED    = 250; // ms
	var DEFAULT_ENTRANCE_SPEED = 800; // ms
	var DEFAULT_SLIDER_SPEED     = 500;  // ms, overgangssnelheid tussen slides
	var DEFAULT_SLIDER_AUTOPLAY_SPEED = 4000; // ms
	var DEFAULT_ACCORDION_SPEED  = 400;  // ms
	var DEFAULT_VIDEO_SPEED      = 20;   // parallax: % verschuiving, reveal/play: ms
	var DEFAULT_TEXT_STAGGER     = 30;   // ms tussen elke letter/woord/regel
	var DEFAULT_TEXT_SPEED       = 600;  // ms per eenheid
	var DEFAULT_COUNTER_SPEED    = 1500; // ms om naar het eindgetal te tellen
	var DEFAULT_MAGNETIC_STRENGTH = 40;  // px, hoever de knop de cursor volgt
	var DEFAULT_MARQUEE_SPEED    = 30;   // seconden voor 1 volledige loop

	function isHoverSupported( name ) {
		return HOVER_BLOCKS.indexOf( name ) !== -1;
	}

	function isEntranceSupported( name ) {
		return ENTRANCE_BLOCKS.indexOf( name ) !== -1;
	}

	function isSliderSupported( name ) {
		return GSAP_SLIDER_BLOCKS.indexOf( name ) !== -1;
	}

	function isAccordionSupported( name ) {
		return GSAP_ACCORDION_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapVideoSupported( name ) {
		return GSAP_VIDEO_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapTextSupported( name ) {
		return GSAP_TEXT_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapCounterSupported( name ) {
		return GSAP_COUNTER_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapMagneticSupported( name ) {
		return GSAP_MAGNETIC_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapHorizontalSupported( name ) {
		return GSAP_HORIZONTAL_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapFullpageSupported( name ) {
		return GSAP_FULLPAGE_BLOCKS.indexOf( name ) !== -1;
	}

	function isGsapMarqueeSupported( name ) {
		return GSAP_MARQUEE_BLOCKS.indexOf( name ) !== -1;
	}

	function classForGsapVideo( value ) {
		return value ? 'szm-gsap-video-' + value : '';
	}

	function classForGsapText( value ) {
		return value ? 'szm-gsap-text-' + value : '';
	}

	function mapToOptions( map ) {
		return Object.keys( map ).map( function ( value ) {
			return { value: value, label: map[ value ] };
		} );
	}

	function classForHover( value ) {
		return value ? 'szm-hover-' + value : '';
	}

	function classForEntrance( value ) {
		return value ? 'szm-entrance-' + value : '';
	}

	/**
	 * 1. Attributes registreren op de ondersteunde blokken.
	 */
	function addAnimationAttributes( blockSettings, name ) {
		var extra = {};

		if ( isHoverSupported( name ) ) {
			extra.szmHoverAnimation = { type: 'string', default: '' };
			extra.szmHoverSpeed     = { type: 'number', default: DEFAULT_HOVER_SPEED };
		}

		if ( isEntranceSupported( name ) ) {
			extra.szmEntranceAnimation   = { type: 'string', default: '' };
			extra.szmEntranceSpeed       = { type: 'number', default: DEFAULT_ENTRANCE_SPEED };
			// Stagger step: hoeveel ms elk volgend kind-blok extra vertraging krijgt.
			// Wordt ingesteld op een container (bv. Columns/Group) en werkt door naar de directe kinderen.
			extra.szmEntranceStaggerStep = { type: 'number', default: 0 };
			// Automatisch berekende vertraging voor dit blok (index-onder-siblings x parent-staggerStep).
			// Niet rechtstreeks door de gebruiker ingesteld, zie withAnimationControls hieronder.
			extra.szmEntranceDelay       = { type: 'number', default: 0 };
		}

		if ( isSliderSupported( name ) ) {
			extra.szmGsapSlider             = { type: 'boolean', default: false };
			extra.szmGsapSliderAutoplay     = { type: 'boolean', default: false };
			extra.szmGsapSliderAutoplaySpeed = { type: 'number', default: DEFAULT_SLIDER_AUTOPLAY_SPEED };
			extra.szmGsapSliderLoop         = { type: 'boolean', default: true };
			extra.szmGsapSliderSpeed        = { type: 'number', default: DEFAULT_SLIDER_SPEED };
		}

		if ( isAccordionSupported( name ) ) {
			extra.szmGsapAccordion            = { type: 'boolean', default: false };
			extra.szmGsapAccordionSpeed       = { type: 'number', default: DEFAULT_ACCORDION_SPEED };
			extra.szmGsapAccordionMultiple    = { type: 'boolean', default: false };
			// -1 = alles standaard dicht.
			extra.szmGsapAccordionDefaultOpen = { type: 'number', default: -1 };
		}

		if ( isGsapVideoSupported( name ) ) {
			extra.szmGsapVideoEffect = { type: 'string', default: '' };
			extra.szmGsapVideoSpeed  = { type: 'number', default: DEFAULT_VIDEO_SPEED };
		}

		if ( isGsapTextSupported( name ) ) {
			extra.szmGsapText        = { type: 'string', default: '' };
			extra.szmGsapTextSpeed   = { type: 'number', default: DEFAULT_TEXT_SPEED };
			extra.szmGsapTextStagger = { type: 'number', default: DEFAULT_TEXT_STAGGER };
		}

		if ( isGsapCounterSupported( name ) ) {
			extra.szmGsapCounter      = { type: 'boolean', default: false };
			extra.szmGsapCounterSpeed = { type: 'number', default: DEFAULT_COUNTER_SPEED };
		}

		if ( isGsapMagneticSupported( name ) ) {
			extra.szmGsapMagnetic         = { type: 'boolean', default: false };
			extra.szmGsapMagneticStrength = { type: 'number', default: DEFAULT_MAGNETIC_STRENGTH };
		}

		if ( isGsapHorizontalSupported( name ) ) {
			// Sluit elkaar uit met szmGsapAccordion op hetzelfde blok (core/group);
			// als beide aan staan wint de accordion, zie withAnimationControls.
			extra.szmGsapHorizontal = { type: 'boolean', default: false };
		}

		if ( isGsapFullpageSupported( name ) ) {
			// Sluit elkaar uit met szmGsapAccordion en szmGsapHorizontal op hetzelfde
			// blok; prioriteit accordion > horizontal > fullpage, zie addSaveProps.
			extra.szmGsapFullpage = { type: 'boolean', default: false };
		}

		if ( isGsapMarqueeSupported( name ) ) {
			extra.szmGsapMarquee          = { type: 'boolean', default: false };
			extra.szmGsapMarqueeSpeed     = { type: 'number', default: DEFAULT_MARQUEE_SPEED };
			extra.szmGsapMarqueeDirection = { type: 'string', default: 'left' };
		}

		if ( ! Object.keys( extra ).length ) {
			return blockSettings;
		}

		blockSettings.attributes = Object.assign( {}, blockSettings.attributes, extra );

		return blockSettings;
	}
	addFilter(
		'blocks.registerBlockType',
		'szm-hover-animations/add-attributes',
		addAnimationAttributes
	);

	/**
	 * 2. Dropdowns + sliders toevoegen aan het instellingenpaneel (Inspector),
	 * en de stagger-vertraging van dit blok automatisch bijhouden op basis van
	 * zijn positie tussen zijn siblings en de staggerStep van de parent.
	 */
	var withAnimationControls = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			var name           = props.name;
			var clientId       = props.clientId;
			var attributes     = props.attributes;
			var setAttributes  = props.setAttributes;
			var showHover      = isHoverSupported( name );
			var showEntrance   = isEntranceSupported( name );
			var showSlider     = isSliderSupported( name );
			var showAccordion  = isAccordionSupported( name );
			var showGsapVideo  = isGsapVideoSupported( name );
			var showGsapText   = isGsapTextSupported( name );
			var showGsapCounter = isGsapCounterSupported( name );
			var showGsapMagnetic = isGsapMagneticSupported( name );
			var showGsapHorizontal = isGsapHorizontalSupported( name );
			var showGsapFullpage = isGsapFullpageSupported( name );
			var showGsapMarquee = isGsapMarqueeSupported( name );

			// Bereken automatisch hoeveel vertraging dit blok moet krijgen: zijn
			// index tussen de directe siblings van dezelfde parent, vermenigvuldigd
			// met de staggerStep die op die parent is ingesteld.
			var computedDelay = useSelect( function ( select ) {
				if ( ! showEntrance ) {
					return 0;
				}

				var editor = select( 'core/block-editor' );
				if ( ! editor ) {
					return 0;
				}

				var rootClientId = editor.getBlockRootClientId( clientId );
				if ( ! rootClientId ) {
					return 0;
				}

				var parentAttributes = editor.getBlockAttributes( rootClientId );
				var step = ( parentAttributes && parentAttributes.szmEntranceStaggerStep ) || 0;
				if ( ! step ) {
					return 0;
				}

				var siblingIds = editor.getBlockOrder( rootClientId );
				var index = siblingIds.indexOf( clientId );
				if ( index === -1 ) {
					return 0;
				}

				return index * step;
			}, [ clientId, showEntrance ] );

			useEffect( function () {
				if ( showEntrance && computedDelay !== attributes.szmEntranceDelay ) {
					setAttributes( { szmEntranceDelay: computedDelay } );
				}
				// eslint-disable-next-line
			}, [ computedDelay, showEntrance ] );

			if ( ! showHover && ! showEntrance && ! showSlider && ! showAccordion && ! showGsapVideo &&
				! showGsapText && ! showGsapCounter && ! showGsapMagnetic && ! showGsapHorizontal &&
				! showGsapFullpage && ! showGsapMarquee ) {
				return el( BlockEdit, props );
			}

			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				el(
					InspectorControls,
					null,
					showHover && el(
						PanelBody,
						{ title: __( 'Hover animatie', 'szm-hover-animations' ), initialOpen: true },
						el( SelectControl, {
							label: __( 'Animatie bij hover', 'szm-hover-animations' ),
							value: attributes.szmHoverAnimation || '',
							options: mapToOptions( HOVER_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmHoverAnimation: value } );
							},
						} ),
						!! attributes.szmHoverAnimation && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmHoverSpeed || DEFAULT_HOVER_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmHoverSpeed: value } );
							},
							min: 100,
							max: 1000,
							step: 50,
						} )
					),
					showEntrance && el(
						PanelBody,
						{ title: __( 'Entrance animatie', 'szm-hover-animations' ), initialOpen: false },
						el( SelectControl, {
							label: __( 'Animatie bij in beeld scrollen', 'szm-hover-animations' ),
							value: attributes.szmEntranceAnimation || '',
							options: mapToOptions( ENTRANCE_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmEntranceAnimation: value } );
							},
						} ),
						!! attributes.szmEntranceAnimation && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmEntranceSpeed || DEFAULT_ENTRANCE_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmEntranceSpeed: value } );
							},
							min: 100,
							max: 2000,
							step: 50,
						} ),
						el( RangeControl, {
							label: __( 'Stagger: vertraging per kind-blok (ms)', 'szm-hover-animations' ),
							help: __( 'Geldt voor de directe kind-blokken van dit blok (bv. kolommen in een Columns-blok), niet voor dit blok zelf.', 'szm-hover-animations' ),
							value: attributes.szmEntranceStaggerStep || 0,
							onChange: function ( value ) {
								setAttributes( { szmEntranceStaggerStep: value } );
							},
							min: 0,
							max: 500,
							step: 25,
						} )
					),
					showSlider && el(
						PanelBody,
						{ title: __( 'GSAP: Slider', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Kolommen als slider tonen', 'szm-hover-animations' ),
							help: __( 'Elke kolom wordt een slide; front-end krijgt pijltjes, dots en swipe. Niet live zichtbaar in de editor, alleen op de front-end/preview.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapSlider,
							onChange: function ( value ) {
								setAttributes( { szmGsapSlider: value } );
							},
						} ),
						!! attributes.szmGsapSlider && el( RangeControl, {
							label: __( 'Overgangssnelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapSliderSpeed || DEFAULT_SLIDER_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderSpeed: value } );
							},
							min: 100,
							max: 1500,
							step: 50,
						} ),
						!! attributes.szmGsapSlider && el( ToggleControl, {
							label: __( 'Loop (na laatste slide terug naar eerste)', 'szm-hover-animations' ),
							checked: attributes.szmGsapSliderLoop !== false,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderLoop: value } );
							},
						} ),
						!! attributes.szmGsapSlider && el( ToggleControl, {
							label: __( 'Automatisch doorschuiven', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapSliderAutoplay,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderAutoplay: value } );
							},
						} ),
						!! attributes.szmGsapSlider && !! attributes.szmGsapSliderAutoplay && el( RangeControl, {
							label: __( 'Tijd per slide (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapSliderAutoplaySpeed || DEFAULT_SLIDER_AUTOPLAY_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderAutoplaySpeed: value } );
							},
							min: 1500,
							max: 10000,
							step: 500,
						} )
					),
					showAccordion && el(
						PanelBody,
						{ title: __( 'GSAP: Accordion', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Kind-blokken als accordion tonen', 'szm-hover-animations' ),
							help: __( 'Het eerste element van elk direct kind-blok wordt de klikbare kop, de rest is de inklapbare inhoud. Niet live zichtbaar in de editor, alleen op de front-end/preview.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapAccordion,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordion: value } );
							},
						} ),
						!! attributes.szmGsapAccordion && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapAccordionSpeed || DEFAULT_ACCORDION_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionSpeed: value } );
							},
							min: 100,
							max: 1000,
							step: 50,
						} ),
						!! attributes.szmGsapAccordion && el( ToggleControl, {
							label: __( 'Meerdere panelen tegelijk open toestaan', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapAccordionMultiple,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionMultiple: value } );
							},
						} ),
						!! attributes.szmGsapAccordion && el( RangeControl, {
							label: __( 'Standaard geopend paneel (-1 = alles dicht)', 'szm-hover-animations' ),
							value: typeof attributes.szmGsapAccordionDefaultOpen === 'number' ? attributes.szmGsapAccordionDefaultOpen : -1,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionDefaultOpen: value } );
							},
							min: -1,
							max: 10,
							step: 1,
						} )
					),
					showGsapVideo && el(
						PanelBody,
						{ title: __( 'GSAP: Video animatie', 'szm-hover-animations' ), initialOpen: false },
						el( SelectControl, {
							label: __( 'Effect', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoEffect || '',
							options: mapToOptions( GSAP_VIDEO_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoEffect: value } );
							},
						} ),
						attributes.szmGsapVideoEffect === 'parallax' && el( RangeControl, {
							label: __( 'Parallax-intensiteit (%)', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || DEFAULT_VIDEO_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 5,
							max: 50,
							step: 5,
						} ),
						attributes.szmGsapVideoEffect === 'reveal' && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || 800,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 200,
							max: 2000,
							step: 100,
						} ),
						attributes.szmGsapVideoEffect === 'scrub' && el( RangeControl, {
							label: __( 'Scrollafstand (% van schermhoogte)', 'szm-hover-animations' ),
							help: __( 'Hoe ver iemand moet scrollen om de hele video af te spelen. De video wordt vastgepind tijdens het scrubben.', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || 200,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 100,
							max: 500,
							step: 25,
						} )
					),
					showGsapText && el(
						PanelBody,
						{ title: __( 'GSAP: Tekst-reveal (SplitText)', 'szm-hover-animations' ), initialOpen: false },
						el( SelectControl, {
							label: __( 'Opsplitsen en onthullen', 'szm-hover-animations' ),
							value: attributes.szmGsapText || '',
							options: mapToOptions( GSAP_TEXT_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmGsapText: value } );
							},
							help: __( 'Splitst de tekst met SplitText en onthult per letter/woord/regel bij scrollen in beeld. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
						} ),
						!! attributes.szmGsapText && el( RangeControl, {
							label: __( 'Snelheid per eenheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapTextSpeed || DEFAULT_TEXT_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapTextSpeed: value } );
							},
							min: 200,
							max: 1500,
							step: 50,
						} ),
						!! attributes.szmGsapText && el( RangeControl, {
							label: __( 'Stagger tussen eenheden (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapTextStagger || DEFAULT_TEXT_STAGGER,
							onChange: function ( value ) {
								setAttributes( { szmGsapTextStagger: value } );
							},
							min: 0,
							max: 150,
							step: 5,
						} )
					),
					showGsapCounter && el(
						PanelBody,
						{ title: __( 'GSAP: Animated counter', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Getal optellen bij in beeld scrollen', 'szm-hover-animations' ),
							help: __( 'Herkent het eerste getal in de tekst van deze Heading en telt het op van 0 naar dat getal. Voeg zelf een € of % toe in de tekst; die blijft staan. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapCounter,
							onChange: function ( value ) {
								setAttributes( { szmGsapCounter: value } );
							},
						} ),
						!! attributes.szmGsapCounter && el( RangeControl, {
							label: __( 'Duur (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapCounterSpeed || DEFAULT_COUNTER_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapCounterSpeed: value } );
							},
							min: 300,
							max: 4000,
							step: 100,
						} )
					),
					showGsapMagnetic && el(
						PanelBody,
						{ title: __( 'GSAP: Magnetic button', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Knop volgt de cursor (magnetisch)', 'szm-hover-animations' ),
							help: __( 'De knop trekt lichtjes mee met de muis binnen zijn eigen omtrek. Op touchscreens (geen cursor) geeft een tik in plaats daarvan een korte "pols"-animatie. Niet live zichtbaar in de editor, alleen op de front-end.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapMagnetic,
							onChange: function ( value ) {
								setAttributes( { szmGsapMagnetic: value } );
							},
						} ),
						!! attributes.szmGsapMagnetic && el( RangeControl, {
							label: __( 'Trekkracht (px)', 'szm-hover-animations' ),
							value: attributes.szmGsapMagneticStrength || DEFAULT_MAGNETIC_STRENGTH,
							onChange: function ( value ) {
								setAttributes( { szmGsapMagneticStrength: value } );
							},
							min: 10,
							max: 100,
							step: 5,
						} )
					),
					showGsapHorizontal && el(
						PanelBody,
						{ title: __( 'GSAP: Horizontal scroll', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Kind-blokken horizontaal vastpinnen en scrollen', 'szm-hover-animations' ),
							help: __( 'Pint deze Group vast en scrollt zijn directe kind-blokken horizontaal mee met verticaal scrollen (bekend van awwwards-sites). Sluit elkaar uit met de accordion hierboven op hetzelfde blok — staat die ook aan, dan wint de accordion. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapHorizontal,
							onChange: function ( value ) {
								setAttributes( { szmGsapHorizontal: value } );
							},
						} )
					),
					showGsapFullpage && el(
						PanelBody,
						{ title: __( 'GSAP: Full-viewport scroll slides', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Kind-blokken als volledig-scherm scroll-slides tonen', 'szm-hover-animations' ),
							help: __( 'Elk direct kind-blok wordt een volledig-scherm paneel; scrollen kruisfade\'t naar het volgende paneel (bekend van Apple-productpagina\'s). Sluit elkaar uit met accordion en horizontal scroll hierboven op hetzelfde blok — staat een van die twee ook aan, dan wint die. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapFullpage,
							onChange: function ( value ) {
								setAttributes( { szmGsapFullpage: value } );
							},
						} )
					),
					showGsapMarquee && el(
						PanelBody,
						{ title: __( 'GSAP: Infinite marquee', 'szm-hover-animations' ), initialOpen: false },
						el( ToggleControl, {
							label: __( 'Lijst-items eindeloos laten doorschuiven', 'szm-hover-animations' ),
							help: __( 'De lijst-items dupliceren zichzelf en schuiven naadloos in een lus door (logo-strip, testimonials, tags). Pauzeert bij hover; op touchscreens zet een tik pauzeren/doorlopen om. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapMarquee,
							onChange: function ( value ) {
								setAttributes( { szmGsapMarquee: value } );
							},
						} ),
						!! attributes.szmGsapMarquee && el( SelectControl, {
							label: __( 'Richting', 'szm-hover-animations' ),
							value: attributes.szmGsapMarqueeDirection || 'left',
							options: [
								{ value: 'left', label: __( 'Naar links', 'szm-hover-animations' ) },
								{ value: 'right', label: __( 'Naar rechts', 'szm-hover-animations' ) },
							],
							onChange: function ( value ) {
								setAttributes( { szmGsapMarqueeDirection: value } );
							},
						} ),
						!! attributes.szmGsapMarquee && el( RangeControl, {
							label: __( 'Tijd per volledige loop (s)', 'szm-hover-animations' ),
							value: attributes.szmGsapMarqueeSpeed || DEFAULT_MARQUEE_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapMarqueeSpeed: value } );
							},
							min: 5,
							max: 90,
							step: 5,
						} )
					)
				)
			);
		};
	}, 'withAnimationControls' );
	addFilter(
		'editor.BlockEdit',
		'szm-hover-animations/add-controls',
		withAnimationControls
	);

	/**
	 * 3. Classes + CSS-variabelen toevoegen aan de opgeslagen markup (front-end).
	 */
	function addSaveProps( extraProps, blockType, attributes ) {
		var classes = [];
		var style   = Object.assign( {}, extraProps.style );

		if ( isHoverSupported( blockType.name ) && attributes.szmHoverAnimation ) {
			classes.push( 'szm-hover', classForHover( attributes.szmHoverAnimation ) );
			style[ '--szm-hover-speed' ] = ( attributes.szmHoverSpeed || DEFAULT_HOVER_SPEED ) + 'ms';
		}

		if ( isEntranceSupported( blockType.name ) && attributes.szmEntranceAnimation ) {
			classes.push( 'szm-entrance', classForEntrance( attributes.szmEntranceAnimation ) );
			style[ '--szm-entrance-speed' ] = ( attributes.szmEntranceSpeed || DEFAULT_ENTRANCE_SPEED ) + 'ms';
			style[ '--szm-entrance-delay' ] = ( attributes.szmEntranceDelay || 0 ) + 'ms';
		}

		if ( isSliderSupported( blockType.name ) && attributes.szmGsapSlider ) {
			classes.push( 'szm-gsap-slider' );
			extraProps[ 'data-szm-slider-speed' ]          = attributes.szmGsapSliderSpeed || DEFAULT_SLIDER_SPEED;
			extraProps[ 'data-szm-slider-autoplay' ]       = !! attributes.szmGsapSliderAutoplay;
			extraProps[ 'data-szm-slider-autoplay-speed' ] = attributes.szmGsapSliderAutoplaySpeed || DEFAULT_SLIDER_AUTOPLAY_SPEED;
			extraProps[ 'data-szm-slider-loop' ]           = attributes.szmGsapSliderLoop !== false;
		}

		if ( isAccordionSupported( blockType.name ) && attributes.szmGsapAccordion ) {
			classes.push( 'szm-gsap-accordion' );
			extraProps[ 'data-szm-accordion-speed' ]        = attributes.szmGsapAccordionSpeed || DEFAULT_ACCORDION_SPEED;
			extraProps[ 'data-szm-accordion-multiple' ]     = !! attributes.szmGsapAccordionMultiple;
			extraProps[ 'data-szm-accordion-default-open' ] = typeof attributes.szmGsapAccordionDefaultOpen === 'number' ? attributes.szmGsapAccordionDefaultOpen : -1;
		}

		if ( isGsapVideoSupported( blockType.name ) && attributes.szmGsapVideoEffect ) {
			classes.push( classForGsapVideo( attributes.szmGsapVideoEffect ) );
			extraProps[ 'data-szm-video-speed' ] = attributes.szmGsapVideoSpeed || DEFAULT_VIDEO_SPEED;
		}

		if ( isGsapTextSupported( blockType.name ) && attributes.szmGsapText ) {
			classes.push( 'szm-gsap-text', classForGsapText( attributes.szmGsapText ) );
			extraProps[ 'data-szm-text-speed' ]   = attributes.szmGsapTextSpeed || DEFAULT_TEXT_SPEED;
			extraProps[ 'data-szm-text-stagger' ] = attributes.szmGsapTextStagger || DEFAULT_TEXT_STAGGER;
		}

		if ( isGsapCounterSupported( blockType.name ) && attributes.szmGsapCounter ) {
			classes.push( 'szm-gsap-counter' );
			extraProps[ 'data-szm-counter-speed' ] = attributes.szmGsapCounterSpeed || DEFAULT_COUNTER_SPEED;
		}

		if ( isGsapMagneticSupported( blockType.name ) && attributes.szmGsapMagnetic ) {
			classes.push( 'szm-gsap-magnetic' );
			extraProps[ 'data-szm-magnetic-strength' ] = attributes.szmGsapMagneticStrength || DEFAULT_MAGNETIC_STRENGTH;
		}

		// Horizontal scroll sluit accordion uit op hetzelfde blok (core/group) — bij
		// beide aan wint de accordion (checked eerst hierboven, class staat al vast).
		if ( isGsapHorizontalSupported( blockType.name ) && attributes.szmGsapHorizontal && ! attributes.szmGsapAccordion ) {
			classes.push( 'szm-gsap-horizontal' );
		}

		// Fullpage sluit zowel accordion als horizontal scroll uit op hetzelfde blok —
		// prioriteit accordion > horizontal > fullpage (elk verder in de keten checkt de vorige).
		if ( isGsapFullpageSupported( blockType.name ) && attributes.szmGsapFullpage && ! attributes.szmGsapAccordion && ! attributes.szmGsapHorizontal ) {
			classes.push( 'szm-gsap-fullpage' );
		}

		if ( isGsapMarqueeSupported( blockType.name ) && attributes.szmGsapMarquee ) {
			classes.push( 'szm-gsap-marquee' );
			extraProps[ 'data-szm-marquee-speed' ]     = attributes.szmGsapMarqueeSpeed || DEFAULT_MARQUEE_SPEED;
			extraProps[ 'data-szm-marquee-direction' ] = attributes.szmGsapMarqueeDirection || 'left';
		}

		if ( ! classes.length ) {
			return extraProps;
		}

		extraProps.className = ( extraProps.className ? extraProps.className + ' ' : '' ) + classes.join( ' ' );
		extraProps.style = style;

		return extraProps;
	}
	addFilter(
		'blocks.getSaveContent.extraProps',
		'szm-hover-animations/add-save-props',
		addSaveProps
	);

	/**
	 * 4. Classes ook in de editor-canvas zelf tonen. Entrance-animaties worden
	 * in de editor altijd als "onthuld" getoond (geen IntersectionObserver in
	 * de canvas), zodat blokken niet onzichtbaar lijken tijdens het bewerken.
	 */
	var withAnimationPreview = createHigherOrderComponent( function ( BlockListBlock ) {
		return function ( props ) {
			var name       = props.name;
			var attributes = props.attributes;
			var showHover    = isHoverSupported( name ) && !! attributes.szmHoverAnimation;
			var showEntrance = isEntranceSupported( name ) && !! attributes.szmEntranceAnimation;

			if ( ! showHover && ! showEntrance ) {
				return el( BlockListBlock, props );
			}

			var classes = [ props.wrapperProps && props.wrapperProps.className ];
			var style   = Object.assign( {}, props.wrapperProps && props.wrapperProps.style );

			if ( showHover ) {
				classes.push( 'szm-hover', classForHover( attributes.szmHoverAnimation ) );
				style[ '--szm-hover-speed' ] = ( attributes.szmHoverSpeed || DEFAULT_HOVER_SPEED ) + 'ms';
			}

			if ( showEntrance ) {
				classes.push( 'szm-entrance', 'szm-entrance-revealed', classForEntrance( attributes.szmEntranceAnimation ) );
				style[ '--szm-entrance-speed' ] = ( attributes.szmEntranceSpeed || DEFAULT_ENTRANCE_SPEED ) + 'ms';
				style[ '--szm-entrance-delay' ] = ( attributes.szmEntranceDelay || 0 ) + 'ms';
			}

			var wrapperProps = Object.assign( {}, props.wrapperProps, {
				className: classes.filter( Boolean ).join( ' ' ),
				style: style,
			} );

			return el( BlockListBlock, Object.assign( {}, props, { wrapperProps: wrapperProps } ) );
		};
	}, 'withAnimationPreview' );
	addFilter(
		'editor.BlockListBlock',
		'szm-hover-animations/add-preview',
		withAnimationPreview
	);
} )( window.wp, window.szmHoverAnimations );
