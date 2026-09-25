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
	var Button                  = wp.components.Button;
	var __                      = wp.i18n.__;

	var HOVER_BLOCKS       = settings.blocks || [];
	var ENTRANCE_BLOCKS    = settings.entranceBlocks || [];
	var HOVER_OPTIONS_MAP  = settings.options || {};
	// Preview-GIF's (assets/previews/<sleutel>.gif), alleen de sleutels die bestaan.
	var PREVIEWS    = settings.previews || [];
	var PREVIEW_URL = settings.previewUrl || '';
	var ENTRANCE_OPTIONS_MAP = settings.entranceOptions || {};

	// GSAP-module: geen nieuwe blokken, gedrag toegevoegd aan bestaande blokken.
	var GSAP_SLIDER_BLOCKS    = settings.gsapSliderBlocks || [];
	var GSAP_PROCESS_BLOCKS   = settings.gsapProcessBlocks || [];
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

	// Eén-dropdown GSAP-effect-keuze per blok-familie: core/columns kiest
	// tussen slider/proces-stappen, core/group tussen accordion/horizontal/
	// fullpage — voorheen losse aan/uit-toggles die tegelijk zichtbaar waren
	// ondanks dat ze elkaar al uitsloten. Video/tekst-reveal hadden al maar
	// één dropdown (geen tweede effect op hetzelfde bloktype) en blijven op
	// hun eigen attribute (szmGsapVideoEffect/szmGsapText) staan.
	var GSAP_COLUMNS_OPTIONS_MAP = settings.gsapColumnsOptions || {};
	var GSAP_GROUP_OPTIONS_MAP   = settings.gsapGroupOptions || {};
	var EASING_OPTIONS_MAP       = settings.easingOptions || {};
	var PIN_START_OPTIONS_MAP    = settings.pinStartOptions || {};
	var LOOP_DELAY_OPTIONS_MAP   = settings.loopDelayOptions || {};
	var FULLPAGE_TRANSITION_OPTIONS_MAP = settings.fullpageTransitionOptions || {};
	var HORIZONTAL_MODE_OPTIONS_MAP     = settings.horizontalModeOptions || {};

	// Curated easing-presets → concrete CSS-timing-function. GSAP-kant van
	// dezelfde presets staat in assets/gsap-effects.js (EASE_GSAP_MAP).
	var EASE_CSS_MAP = {
		smooth: 'ease',
		snappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
		bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		linear: 'linear',
	};

	var DEFAULT_HOVER_SPEED    = 250; // ms
	var DEFAULT_ENTRANCE_SPEED = 800; // ms
	// Schuifafstand per entrance-variant (px) als het blok zelf niets instelt;
	// moet gelijk blijven aan de var()-fallbacks in style.css. Varianten die
	// hier niet staan (fade-in) schuiven niet en krijgen geen afstand-slider.
	var ENTRANCE_DISTANCE_DEFAULTS = { 'slide-up': 32, reveal: 24 };
	// "Fade-in reveal" (naar nixowebbuilding.nl) is korter dan de 800ms-standaard.
	var REVEAL_ENTRANCE_SPEED  = 400; // ms
	// Alleen blokken met kind-blokken hebben iets aan de stagger-slider.
	var ENTRANCE_STAGGER_BLOCKS = [
		'core/group', 'core/cover', 'core/column', 'core/columns', 'core/buttons',
		'core/gallery', 'core/list', 'core/quote', 'core/media-text', 'core/details',
		'core/social-links',
	];
	var DEFAULT_SLIDER_SPEED     = 500;  // ms, overgangssnelheid tussen slides
	var DEFAULT_SLIDER_AUTOPLAY_SPEED = 4000; // ms
	var DEFAULT_ACCORDION_SPEED  = 400;  // ms
	var DEFAULT_VIDEO_SPEED      = 20;   // parallax: % verschuiving, reveal/play: ms
	var DEFAULT_TEXT_STAGGER     = 30;   // ms tussen elke letter/woord/regel
	var DEFAULT_TEXT_SPEED       = 600;  // ms per eenheid
	var DEFAULT_COUNTER_SPEED    = 1500; // ms om naar het eindgetal te tellen
	var DEFAULT_MAGNETIC_STRENGTH = 40;  // px, hoever de knop de cursor volgt
	var DEFAULT_MARQUEE_SPEED    = 30;   // seconden voor 1 volledige loop
	var DEFAULT_EASING           = 'smooth';
	var DEFAULT_PIN_START        = 'top';
	var DEFAULT_LOOP_DELAY       = 'normal';
	var DEFAULT_PROCESS_SCROLL_LENGTH = 100; // % van schermhoogte per stap

	function isHoverSupported( name ) {
		return HOVER_BLOCKS.indexOf( name ) !== -1;
	}

	function isEntranceSupported( name ) {
		return ENTRANCE_BLOCKS.indexOf( name ) !== -1;
	}

	function isColumnsFamily( name ) {
		return GSAP_SLIDER_BLOCKS.indexOf( name ) !== -1 || GSAP_PROCESS_BLOCKS.indexOf( name ) !== -1;
	}

	function isGroupFamily( name ) {
		return GSAP_ACCORDION_BLOCKS.indexOf( name ) !== -1 ||
			GSAP_HORIZONTAL_BLOCKS.indexOf( name ) !== -1 ||
			GSAP_FULLPAGE_BLOCKS.indexOf( name ) !== -1;
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

	/**
	 * Klein voorbeeld-GIF-je onder een effect-keuze, zodat je ziet wat het effect
	 * doet voordat je naar de front-end gaat. Sleutel = '<as>-<waarde>' (bv.
	 * 'hover-lift', 'entrance-reveal') of alleen de toggle-naam ('counter').
	 * Geen bestand = niets tonen.
	 */
	function previewFor( key ) {
		if ( ! key || PREVIEWS.indexOf( key ) === -1 ) {
			return null;
		}
		return el( 'img', {
			key: 'szm-preview-' + key,
			className: 'szm-ha-preview',
			src: PREVIEW_URL + key + '.gif',
			alt: '',
			loading: 'lazy',
		} );
	}

	function classForHover( value ) {
		return value ? 'szm-hover-' + value : '';
	}

	function classForEntrance( value ) {
		return value ? 'szm-entrance-' + value : '';
	}

	/**
	 * "Toepassen op kinderen": de container geeft zijn animatie door aan zijn
	 * kind-blokken. Zelfde regels als collectTargets in assets/frontend.js:
	 * kolommen/grids/rijen/knoppen/galerij/social-links zijn doorzichtig (hun
	 * items animeren los), een eigen instelling op een kind wint.
	 */
	var PASS_THROUGH_BLOCKS = [ 'core/columns', 'core/buttons', 'core/gallery', 'core/social-links' ];

	function appliesToChildren( name, attributes, kind ) {
		if ( ! attributes ) {
			return false;
		}
		if ( kind === 'entrance' ) {
			return ENTRANCE_STAGGER_BLOCKS.indexOf( name ) !== -1 && isEntranceSupported( name ) &&
				!! attributes.szmEntranceAnimation && attributes.szmEntranceTarget === 'children';
		}
		return isHoverSupported( name ) && !! attributes.szmHoverAnimation && attributes.szmHoverTarget === 'children';
	}

	function hasOwnAnimation( attributes, kind ) {
		if ( kind === 'entrance' ) {
			return !! ( attributes.szmEntranceAnimation || attributes.szmGsapText );
		}
		return !! attributes.szmHoverAnimation;
	}

	function hasGsapEffect( attributes ) {
		return !! ( attributes.szmGsapEffect || attributes.szmGsapSlider || attributes.szmGsapProcess ||
			attributes.szmGsapAccordion || attributes.szmGsapHorizontal || attributes.szmGsapFullpage ||
			attributes.szmGsapMarquee || attributes.szmGsapVideoEffect || attributes.szmGsapText ||
			attributes.szmGsapCounter || attributes.szmGsapMagnetic );
	}

	function isPassThroughBlock( name, attributes, kind ) {
		attributes = attributes || {};
		if ( hasOwnAnimation( attributes, kind ) || hasGsapEffect( attributes ) ) {
			return false;
		}
		if ( PASS_THROUGH_BLOCKS.indexOf( name ) !== -1 ) {
			return true;
		}
		var layout = attributes.layout;
		return name === 'core/group' && !! layout && (
			layout.type === 'grid' || ( layout.type === 'flex' && layout.orientation !== 'vertical' )
		);
	}

	function countChildTargets( editor, clientId, kind ) {
		var count = 0;
		editor.getBlockOrder( clientId ).forEach( function ( childId ) {
			var childName  = editor.getBlockName( childId );
			var childAttrs = editor.getBlockAttributes( childId ) || {};
			if ( isPassThroughBlock( childName, childAttrs, kind ) ) {
				count += countChildTargets( editor, childId, kind );
			} else if ( ! hasOwnAnimation( childAttrs, kind ) ) {
				count++;
			}
		} );
		return count;
	}

	// clientId van de ouder die zijn animatie aan dit blok doorgeeft, of ''.
	function findInheritingParent( editor, clientId, kind ) {
		var name  = editor.getBlockName( clientId );
		var attrs = editor.getBlockAttributes( clientId ) || {};
		if ( hasOwnAnimation( attrs, kind ) || isPassThroughBlock( name, attrs, kind ) ) {
			return '';
		}
		var parentId = editor.getBlockRootClientId( clientId );
		while ( parentId ) {
			var parentName  = editor.getBlockName( parentId );
			var parentAttrs = editor.getBlockAttributes( parentId ) || {};
			if ( appliesToChildren( parentName, parentAttrs, kind ) ) {
				return parentId;
			}
			if ( ! isPassThroughBlock( parentName, parentAttrs, kind ) ) {
				return '';
			}
			parentId = editor.getBlockRootClientId( parentId );
		}
		return '';
	}

	function blockTitle( name ) {
		var type = wp.blocks.getBlockType( name );
		return type ? type.title : name;
	}

	var TARGET_OPTIONS = [
		{ value: 'self', label: __( 'Dit blok', 'szm-hover-animations' ) },
		{ value: 'children', label: __( 'Kind-blokken (elk apart)', 'szm-hover-animations' ) },
	];
	var DEFAULT_CHILDREN_STAGGER = 100; // ms

	/**
	 * Legacy-fallback: welk effect stond aan vóór de dropdown-samenvoeging
	 * (v1.9.0), gelezen uit de oude losse boolean-attributes. Zo blijven al
	 * gepubliceerde blokken (bv. fse-test post 201, studiozondermeer.nl)
	 * precies hetzelfde ogen zonder dat iemand ze handmatig hoeft te
	 * her-selecteren — dezelfde win-prioriteit die addSaveProps al gebruikte.
	 */
	function legacyColumnsEffect( attributes ) {
		if ( attributes.szmGsapSlider ) {
			return 'slider';
		}
		if ( attributes.szmGsapProcess ) {
			return 'process';
		}
		return '';
	}

	function legacyGroupEffect( attributes ) {
		if ( attributes.szmGsapAccordion ) {
			return 'accordion';
		}
		if ( attributes.szmGsapHorizontal ) {
			return 'horizontal';
		}
		if ( attributes.szmGsapFullpage ) {
			return 'fullpage';
		}
		return '';
	}

	/**
	 * 1. Attributes registreren op de ondersteunde blokken.
	 */
	function addAnimationAttributes( blockSettings, name ) {
		var extra = {};

		var columnsFamily  = isColumnsFamily( name );
		var groupFamily     = isGroupFamily( name );
		var videoFamily     = isGsapVideoSupported( name );
		var textFamily      = isGsapTextSupported( name );
		var magneticFamily  = isGsapMagneticSupported( name );

		if ( isHoverSupported( name ) ) {
			extra.szmHoverAnimation = { type: 'string', default: '' };
			extra.szmHoverSpeed     = { type: 'number', default: DEFAULT_HOVER_SPEED };
			// Hover-groep: dit blok telt als hover-trigger voor kind-blokken met het
			// "Onthullen"-hover-effect (szmHoverAnimation === 'reveal'), onafhankelijk
			// van of dit blok zelf een hover-animatie heeft.
			extra.szmHoverGroup     = { type: 'boolean', default: false };
			extra.szmHoverEasing    = { type: 'string', default: DEFAULT_EASING };
			// 'children' = animatie doorgeven aan de kind-blokken i.p.v. dit blok.
			extra.szmHoverTarget    = { type: 'string', default: 'self' };
		}

		if ( isEntranceSupported( name ) ) {
			extra.szmEntranceAnimation   = { type: 'string', default: '' };
			extra.szmEntranceSpeed       = { type: 'number', default: DEFAULT_ENTRANCE_SPEED };
			// Stagger step: hoeveel ms elk volgend kind-blok extra vertraging krijgt.
			// Wordt ingesteld op een container (bv. Columns/Group) en werkt door naar de directe kinderen.
			extra.szmEntranceStaggerStep = { type: 'number', default: 0 };
			// 'children' = animatie doorgeven aan de kind-blokken i.p.v. dit blok.
			extra.szmEntranceTarget      = { type: 'string', default: 'self' };
			// Automatisch berekende vertraging voor dit blok (index-onder-siblings x parent-staggerStep).
			// Niet rechtstreeks door de gebruiker ingesteld, zie withAnimationControls hieronder.
			extra.szmEntranceDelay       = { type: 'number', default: 0 };
			extra.szmEntranceEasing      = { type: 'string', default: DEFAULT_EASING };
			// Geen default: zolang leeg geldt ENTRANCE_DISTANCE_DEFAULTS via de CSS-
			// fallback en wordt er geen --szm-entrance-distance opgeslagen, zodat al
			// gepubliceerde slide-up-blokken geldig blijven (geen block recovery).
			extra.szmEntranceDistance    = { type: 'number' };
		}

		// Eén dropdown-attribute per blok-familie i.p.v. losse aan/uit-toggles
		// per effect. De oude attributes hieronder blijven geregistreerd zodat
		// al opgeslagen content (met alleen de oude attributes) precies blijft
		// werken via de legacy-fallback in withAnimationControls/addSaveProps.
		if ( columnsFamily || groupFamily ) {
			extra.szmGsapEffect = { type: 'string', default: '' };
			// Sticky proces-stappen: scroll-afstand per stap (nu ook relevant voor
			// Group, niet alleen Columns, sinds process ook daar kan).
			extra.szmGsapProcessScrollLength = { type: 'number', default: DEFAULT_PROCESS_SCROLL_LENGTH };
		}
		if ( columnsFamily || groupFamily || videoFamily ) {
			// Wanneer een gepind scroll-effect begint met pinnen (los van de
			// automatische sticky-header-correctie in gsap-effects.js).
			extra.szmGsapPinStart = { type: 'string', default: DEFAULT_PIN_START };
			// Beide hieronder gelden voor alle gepinde effecten (proces-stappen,
			// horizontal scroll, fullpage, video-scrub) — per-blok toggle, geen
			// aparte instelling op een ouder-element (zie DECISIONS.md).
			extra.szmGsapLockHeading    = { type: 'boolean', default: false };
			extra.szmGsapVerticalCenter = { type: 'boolean', default: false };
		}
		if ( columnsFamily || groupFamily || videoFamily || textFamily || magneticFamily ) {
			extra.szmGsapEasing = { type: 'string', default: DEFAULT_EASING };
		}
		if ( groupFamily ) {
			extra.szmGsapFullpageTransition = { type: 'string', default: 'fade' };
			extra.szmGsapHorizontalMode     = { type: 'string', default: 'scroll' };
		}
		if ( textFamily || isGsapCounterSupported( name ) ) {
			// Herhalen na een tijdje: aan by default (zie DECISIONS.md — user
			// wilde dit niet als opt-in maar als standaardgedrag).
			extra.szmGsapLoop      = { type: 'boolean', default: true };
			extra.szmGsapLoopDelay = { type: 'string', default: DEFAULT_LOOP_DELAY };
		}

		if ( GSAP_SLIDER_BLOCKS.indexOf( name ) !== -1 ) {
			extra.szmGsapSlider             = { type: 'boolean', default: false };
			extra.szmGsapSliderAutoplay     = { type: 'boolean', default: false };
			extra.szmGsapSliderAutoplaySpeed = { type: 'number', default: DEFAULT_SLIDER_AUTOPLAY_SPEED };
			extra.szmGsapSliderLoop         = { type: 'boolean', default: true };
			extra.szmGsapSliderSpeed        = { type: 'number', default: DEFAULT_SLIDER_SPEED };
		}

		if ( GSAP_PROCESS_BLOCKS.indexOf( name ) !== -1 ) {
			extra.szmGsapProcess = { type: 'boolean', default: false };
		}

		if ( GSAP_ACCORDION_BLOCKS.indexOf( name ) !== -1 ) {
			extra.szmGsapAccordion            = { type: 'boolean', default: false };
			extra.szmGsapAccordionSpeed       = { type: 'number', default: DEFAULT_ACCORDION_SPEED };
			extra.szmGsapAccordionMultiple    = { type: 'boolean', default: false };
			// -1 = alles standaard dicht.
			extra.szmGsapAccordionDefaultOpen = { type: 'number', default: -1 };
		}

		if ( videoFamily ) {
			extra.szmGsapVideoEffect = { type: 'string', default: '' };
			extra.szmGsapVideoSpeed  = { type: 'number', default: DEFAULT_VIDEO_SPEED };
		}

		if ( textFamily ) {
			extra.szmGsapText        = { type: 'string', default: '' };
			extra.szmGsapTextSpeed   = { type: 'number', default: DEFAULT_TEXT_SPEED };
			extra.szmGsapTextStagger = { type: 'number', default: DEFAULT_TEXT_STAGGER };
		}

		if ( isGsapCounterSupported( name ) ) {
			extra.szmGsapCounter      = { type: 'boolean', default: false };
			extra.szmGsapCounterSpeed = { type: 'number', default: DEFAULT_COUNTER_SPEED };
		}

		if ( magneticFamily ) {
			extra.szmGsapMagnetic         = { type: 'boolean', default: false };
			extra.szmGsapMagneticStrength = { type: 'number', default: DEFAULT_MAGNETIC_STRENGTH };
		}

		if ( GSAP_HORIZONTAL_BLOCKS.indexOf( name ) !== -1 ) {
			extra.szmGsapHorizontal = { type: 'boolean', default: false };
		}

		if ( GSAP_FULLPAGE_BLOCKS.indexOf( name ) !== -1 ) {
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
	 *
	 * Maximaal 3 panelen per blok: "Hover animatie", "Entrance animatie" en
	 * "GSAP effect" — die derde is één dropdown die alleen de effecten toont
	 * die voor dit bloktype gelden, en na kiezen alleen de bijpassende
	 * instellingen (voorheen tot 6 losse GSAP-panelen tegelijk zichtbaar).
	 */
	var withAnimationControls = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			var name           = props.name;
			var clientId       = props.clientId;
			var attributes     = props.attributes;
			var setAttributes  = props.setAttributes;
			var showHover      = isHoverSupported( name );
			var showEntrance   = isEntranceSupported( name );
			var showColumnsFamily = isColumnsFamily( name );
			var showGroupFamily    = isGroupFamily( name );
			var showGsapVideo  = isGsapVideoSupported( name );
			var showGsapText   = isGsapTextSupported( name );
			var showGsapCounter = isGsapCounterSupported( name );
			var showGsapMagnetic = isGsapMagneticSupported( name );
			var showGsapMarquee = isGsapMarqueeSupported( name );
			// Tekst-reveal en counter staan sinds v1.14.0 in het Entrance-paneel.
			var showGsapBox = showColumnsFamily || showGroupFamily || showGsapVideo ||
				showGsapMagnetic || showGsapMarquee;

			// Entrance-dropdown: CSS-entrances + (per bloktype) de GSAP-entrances.
			// Opslag blijft in de eigen attributes (szmGsapText, szmGsapVideoEffect),
			// dus bestaande blokken blijven geldig. Bij beide aan wint tekst/video.
			var entranceOptions = mapToOptions( ENTRANCE_OPTIONS_MAP );
			if ( showGsapText ) {
				Object.keys( GSAP_TEXT_OPTIONS_MAP ).forEach( function ( k ) {
					if ( k ) {
						entranceOptions.push( { value: 'text-' + k, label: __( 'Tekst: ', 'szm-hover-animations' ) + GSAP_TEXT_OPTIONS_MAP[ k ].toLowerCase() } );
					}
				} );
			}
			if ( showGsapVideo && GSAP_VIDEO_OPTIONS_MAP.reveal ) {
				entranceOptions.push( { value: 'video-reveal', label: __( 'Video: ', 'szm-hover-animations' ) + GSAP_VIDEO_OPTIONS_MAP.reveal.toLowerCase() } );
			}
			var entranceValue = ( showGsapText && attributes.szmGsapText ) ? 'text-' + attributes.szmGsapText :
				( showGsapVideo && attributes.szmGsapVideoEffect === 'reveal' ) ? 'video-reveal' :
				( attributes.szmEntranceAnimation || '' );

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

			// Erft dit blok een animatie van een ouder met "Toepassen op kind-
			// blokken"? Als string teruggeven (geen nieuw object per render).
			var inheritKey = useSelect( function ( select ) {
				var editor = select( 'core/block-editor' );
				if ( ! editor ) {
					return '';
				}
				return findInheritingParent( editor, clientId, 'entrance' ) + '|' +
					findInheritingParent( editor, clientId, 'hover' );
			}, [ clientId ] );

			var entranceTargetCount = useSelect( function ( select ) {
				var editor = select( 'core/block-editor' );
				return editor && appliesToChildren( name, attributes, 'entrance' ) ? countChildTargets( editor, clientId, 'entrance' ) : 0;
			}, [ clientId, name, attributes.szmEntranceAnimation, attributes.szmEntranceTarget ] );

			var hoverTargetCount = useSelect( function ( select ) {
				var editor = select( 'core/block-editor' );
				return editor && appliesToChildren( name, attributes, 'hover' ) ? countChildTargets( editor, clientId, 'hover' ) : 0;
			}, [ clientId, name, attributes.szmHoverAnimation, attributes.szmHoverTarget ] );

			var selectBlock = wp.data.useDispatch( 'core/block-editor' ).selectBlock;

			var inheritIds = inheritKey.split( '|' );
			var inheritPanel = ( inheritIds[ 0 ] || inheritIds[ 1 ] ) && el(
				PanelBody,
				{ title: __( 'Animatie via ouder-blok', 'szm-hover-animations' ), initialOpen: true },
				[ [ 'entrance', inheritIds[ 0 ], __( 'Entrance', 'szm-hover-animations' ) ], [ 'hover', inheritIds[ 1 ], __( 'Hover', 'szm-hover-animations' ) ] ]
					.filter( function ( row ) {
						return !! row[ 1 ];
					} )
					.map( function ( row ) {
						var parentName = wp.data.select( 'core/block-editor' ).getBlockName( row[ 1 ] );
						return el( 'p', { key: row[ 0 ] },
							row[ 2 ] + ': ' + __( 'ingesteld op', 'szm-hover-animations' ) + ' ',
							el( Button, {
								variant: 'link',
								onClick: function () {
									selectBlock( row[ 1 ] );
								},
							}, blockTitle( parentName ) )
						);
					} ),
				el( 'p', { className: 'components-base-control__help' },
					__( 'Stel hier zelf een animatie in om die voor dit blok te overschrijven.', 'szm-hover-animations' ) )
			);

			if ( ! showHover && ! showEntrance && ! showGsapBox ) {
				return inheritPanel ?
					el( Fragment, null, el( BlockEdit, props ), el( InspectorControls, null, inheritPanel ) ) :
					el( BlockEdit, props );
			}

			var entranceTarget = attributes.szmEntranceTarget === 'children' ? 'children' : 'self';
			var hoverTarget    = attributes.szmHoverTarget === 'children' ? 'children' : 'self';

			// Welk effect toont de GSAP-dropdown als geselecteerd: het nieuwe
			// szmGsapEffect-attribute als dat al is aangeraakt, anders afgeleid
			// uit de oude losse toggles (zie legacyColumnsEffect/legacyGroupEffect).
			var columnsEffect = showColumnsFamily ? ( attributes.szmGsapEffect || legacyColumnsEffect( attributes ) ) : '';
			var groupEffect    = showGroupFamily ? ( attributes.szmGsapEffect || legacyGroupEffect( attributes ) ) : '';

			function handleColumnsEffectChange( value ) {
				// Zet de oude toggles altijd expliciet uit zodra de nieuwe dropdown
				// wordt aangeraakt (ook bij "Geen") — anders zou een latere lezing
				// via de legacy-fallback een net uitgezet effect weer "aanzetten".
				setAttributes( {
					szmGsapEffect: value,
					szmGsapSlider: false,
					szmGsapProcess: false,
				} );
			}

			function handleGroupEffectChange( value ) {
				setAttributes( {
					szmGsapEffect: value,
					szmGsapAccordion: false,
					szmGsapHorizontal: false,
					szmGsapFullpage: false,
				} );
			}

			var gsapEasing   = attributes.szmGsapEasing || DEFAULT_EASING;
			var gsapPinStart = attributes.szmGsapPinStart || DEFAULT_PIN_START;

			function easingControl() {
				return el( SelectControl, {
					label: __( 'Easing', 'szm-hover-animations' ),
					value: gsapEasing,
					options: mapToOptions( EASING_OPTIONS_MAP ),
					onChange: function ( value ) {
						setAttributes( { szmGsapEasing: value } );
					},
				} );
			}

			function pinStartControl() {
				return el( SelectControl, {
					label: __( 'Wanneer begint het vastpinnen', 'szm-hover-animations' ),
					help: __( 'Corrigeert automatisch voor een sticky header/adminbalk bovenaan — deze keuze is puur voor hoever in beeld het blok mag staan voordat het pint.', 'szm-hover-animations' ),
					value: gsapPinStart,
					options: mapToOptions( PIN_START_OPTIONS_MAP ),
					onChange: function ( value ) {
						setAttributes( { szmGsapPinStart: value } );
					},
				} );
			}

			// Herbruikbaar voor elk gepind effect (proces-stappen, horizontal
			// scroll, fullpage, video-scrub): per-blok toggle i.p.v. een
			// instelling op een ouder-element, zie DECISIONS.md q6.
			function lockHeadingControl() {
				return el( ToggleControl, {
					label: __( 'Blok erboven mee laten vastzetten', 'szm-hover-animations' ),
					help: __( 'Het blok direct vóór dit blok (bv. een titel) blijft zichtbaar/vast staan zolang dit blok gepind is.', 'szm-hover-animations' ),
					checked: !! attributes.szmGsapLockHeading,
					onChange: function ( value ) {
						setAttributes( { szmGsapLockHeading: value } );
					},
				} );
			}

			function verticalCenterControl() {
				return el( ToggleControl, {
					label: __( 'Sectie verticaal centreren tijdens pin', 'szm-hover-animations' ),
					checked: !! attributes.szmGsapVerticalCenter,
					onChange: function ( value ) {
						setAttributes( { szmGsapVerticalCenter: value } );
					},
				} );
			}

			// Niet voor fullpage: die panelen vullen altijd het hele scherm (vaste
			// exemptie op de pin-start-keuze, zie DECISIONS.md), dus "verticaal
			// centreren" zou daar niets zichtbaars veranderen.
			function lockAndCenterControls() {
				return el( Fragment, null, lockHeadingControl(), verticalCenterControl() );
			}

			function processScrollLengthControl() {
				return el( RangeControl, {
					label: __( 'Scroll-afstand per stap (% van schermhoogte)', 'szm-hover-animations' ),
					help: __( 'Hoger = langzamer/meer scrollen nodig per stap.', 'szm-hover-animations' ),
					value: attributes.szmGsapProcessScrollLength || DEFAULT_PROCESS_SCROLL_LENGTH,
					onChange: function ( value ) {
						setAttributes( { szmGsapProcessScrollLength: value } );
					},
					min: 50,
					max: 200,
					step: 10,
				} );
			}

			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				el(
					InspectorControls,
					null,
					inheritPanel,
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
						previewFor( attributes.szmHoverAnimation && 'hover-' + attributes.szmHoverAnimation ),
						!! attributes.szmHoverAnimation && el( SelectControl, {
							label: __( 'Toepassen op', 'szm-hover-animations' ),
							help: hoverTarget === 'children' ?
								hoverTargetCount + ' ' + __( 'blokken krijgen dit effect. Kolommen, grids, rijen, knoppen en galerijen worden doorlopen: hun items elk apart.', 'szm-hover-animations' ) :
								'',
							value: hoverTarget,
							options: TARGET_OPTIONS,
							onChange: function ( value ) {
								setAttributes( { szmHoverTarget: value } );
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
						} ),
						!! attributes.szmHoverAnimation && el( SelectControl, {
							label: __( 'Easing', 'szm-hover-animations' ),
							value: attributes.szmHoverEasing || DEFAULT_EASING,
							options: mapToOptions( EASING_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmHoverEasing: value } );
							},
						} ),
						el( ToggleControl, {
							label: __( 'Hover-groep', 'szm-hover-animations' ),
							help: __( 'Dit blok telt als hover-trigger voor kind-blokken met het "Onthullen"-hover-effect (bv. een icoon of knop die pas verschijnt als je over deze hele kaart hovert, niet alleen over het icoon zelf).', 'szm-hover-animations' ),
							checked: !! attributes.szmHoverGroup,
							onChange: function ( value ) {
								setAttributes( { szmHoverGroup: value } );
							},
						} )
					),
					showEntrance && el(
						PanelBody,
						{ title: __( 'Entrance animatie', 'szm-hover-animations' ), initialOpen: false },
						el( SelectControl, {
							label: __( 'Animatie bij in beeld scrollen', 'szm-hover-animations' ),
							value: entranceValue,
							options: entranceOptions,
							onChange: function ( value ) {
								var next = { szmEntranceAnimation: value };
								// Eén keuze per blok: de andere entrance-soorten uit.
								if ( showGsapText ) {
									next.szmGsapText = '';
								}
								if ( showGsapVideo && attributes.szmGsapVideoEffect === 'reveal' ) {
									next.szmGsapVideoEffect = '';
								}
								if ( value.indexOf( 'text-' ) === 0 ) {
									next.szmEntranceAnimation = '';
									next.szmGsapText = value.slice( 5 );
									setAttributes( next );
									return;
								}
								if ( value === 'video-reveal' ) {
									next.szmEntranceAnimation = '';
									next.szmGsapVideoEffect = 'reveal';
									setAttributes( next );
									return;
								}
								// Reveal is kort: neem de 400ms over zolang de snelheid
								// nog op de standaard staat (eigen keuze blijft staan).
								if ( value === 'reveal' && ( ! attributes.szmEntranceSpeed || attributes.szmEntranceSpeed === DEFAULT_ENTRANCE_SPEED ) ) {
									next.szmEntranceSpeed = REVEAL_ENTRANCE_SPEED;
								}
								setAttributes( next );
							},
						} ),
						previewFor( entranceValue && ( /^(text|video)-/.test( entranceValue ) ? entranceValue : 'entrance-' + entranceValue ) ),
						!! attributes.szmEntranceAnimation && ENTRANCE_STAGGER_BLOCKS.indexOf( name ) !== -1 && el( SelectControl, {
							label: __( 'Toepassen op', 'szm-hover-animations' ),
							help: entranceTarget === 'children' ?
								entranceTargetCount + ' ' + __( 'blokken komen elk apart binnen, op volgorde. Kolommen, grids, rijen, knoppen en galerijen worden doorlopen: hun items elk apart.', 'szm-hover-animations' ) :
								'',
							value: entranceTarget,
							options: TARGET_OPTIONS,
							onChange: function ( value ) {
								var next = { szmEntranceTarget: value };
								// Zonder stagger komen alle kinderen tegelijk: geef een startwaarde.
								if ( value === 'children' && ! attributes.szmEntranceStaggerStep ) {
									next.szmEntranceStaggerStep = DEFAULT_CHILDREN_STAGGER;
								}
								setAttributes( next );
							},
						} ),
						ENTRANCE_DISTANCE_DEFAULTS.hasOwnProperty( attributes.szmEntranceAnimation ) && el( RangeControl, {
							label: __( 'Schuifafstand (px)', 'szm-hover-animations' ),
							value: typeof attributes.szmEntranceDistance === 'number' ? attributes.szmEntranceDistance : ENTRANCE_DISTANCE_DEFAULTS[ attributes.szmEntranceAnimation ],
							onChange: function ( value ) {
								setAttributes( { szmEntranceDistance: value } );
							},
							min: 0,
							max: 80,
							step: 2,
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
						!! attributes.szmEntranceAnimation && el( SelectControl, {
							label: __( 'Easing', 'szm-hover-animations' ),
							value: attributes.szmEntranceEasing || DEFAULT_EASING,
							options: mapToOptions( EASING_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmEntranceEasing: value } );
							},
						} ),
						ENTRANCE_STAGGER_BLOCKS.indexOf( name ) !== -1 && el( RangeControl, {
							label: __( 'Stagger: vertraging per kind-blok (ms)', 'szm-hover-animations' ),
							help: entranceTarget === 'children' ?
								__( 'Tijd tussen elk volgend blok dat binnenkomt.', 'szm-hover-animations' ) :
								__( 'Geldt voor de directe kind-blokken van dit blok die zelf een entrance hebben (bv. kolommen in een Columns-blok), niet voor dit blok zelf.', 'szm-hover-animations' ),
							value: attributes.szmEntranceStaggerStep || 0,
							onChange: function ( value ) {
								setAttributes( { szmEntranceStaggerStep: value } );
							},
							min: 0,
							max: 500,
							step: 25,
						} ),

						// GSAP-entrances (v1.14.0 hierheen verhuisd uit het GSAP-paneel):
						// video-reveal en tekst-reveal (SplitText).
						showGsapVideo && attributes.szmGsapVideoEffect === 'reveal' && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || 800,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 200,
							max: 2000,
							step: 100,
						} ),
						showGsapVideo && attributes.szmGsapVideoEffect === 'reveal' && easingControl(),
						showGsapText && !! attributes.szmGsapText && el( RangeControl, {
							label: __( 'Snelheid per eenheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapTextSpeed || DEFAULT_TEXT_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapTextSpeed: value } );
							},
							min: 200,
							max: 1500,
							step: 50,
						} ),
						showGsapText && !! attributes.szmGsapText && el( RangeControl, {
							label: __( 'Stagger tussen eenheden (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapTextStagger || DEFAULT_TEXT_STAGGER,
							onChange: function ( value ) {
								setAttributes( { szmGsapTextStagger: value } );
							},
							min: 0,
							max: 150,
							step: 5,
						} ),
						showGsapText && !! attributes.szmGsapText && easingControl(),

						// core/heading: animated counter — bewust los van tekst-reveal
						// hierboven (kan op dezelfde Heading tegelijk aan staan, bv. een
						// "500+ klanten"-cijfer dat zowel telt als per letter onthult).
						showGsapCounter && el( ToggleControl, {
							label: __( 'Getal optellen bij in beeld scrollen', 'szm-hover-animations' ),
							help: __( 'Herkent het eerste getal in de tekst van deze Heading en telt het op van 0 naar dat getal. Voeg zelf een € of % toe in de tekst; die blijft staan. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapCounter,
							onChange: function ( value ) {
								setAttributes( { szmGsapCounter: value } );
							},
						} ),
						!! attributes.szmGsapCounter && previewFor( 'counter' ),
						showGsapCounter && !! attributes.szmGsapCounter && el( RangeControl, {
							label: __( 'Duur (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapCounterSpeed || DEFAULT_COUNTER_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapCounterSpeed: value } );
							},
							min: 300,
							max: 4000,
							step: 100,
						} ),

						// Herhalen: één instelling voor tekst-reveal + counter samen (kan
						// allebei tegelijk op dezelfde Heading staan), aan by default.
						( ( showGsapText && !! attributes.szmGsapText ) || ( showGsapCounter && !! attributes.szmGsapCounter ) ) && el( ToggleControl, {
							label: __( 'Na een tijdje herhalen (verdwijnen + opnieuw afspelen)', 'szm-hover-animations' ),
							help: __( 'Zolang dit blok in beeld blijft, speelt de animatie na de ingestelde wachttijd steeds opnieuw af, in dezelfde stijl als de eerste keer.', 'szm-hover-animations' ),
							checked: attributes.szmGsapLoop !== false,
							onChange: function ( value ) {
								setAttributes( { szmGsapLoop: value } );
							},
						} ),
						( ( showGsapText && !! attributes.szmGsapText ) || ( showGsapCounter && !! attributes.szmGsapCounter ) ) && attributes.szmGsapLoop !== false && el( SelectControl, {
							label: __( 'Wachttijd voor herhalen', 'szm-hover-animations' ),
							value: attributes.szmGsapLoopDelay || DEFAULT_LOOP_DELAY,
							options: mapToOptions( LOOP_DELAY_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmGsapLoopDelay: value } );
							},
						} )
					),
					showGsapBox && el(
						PanelBody,
						{ title: __( 'Scroll & interactie', 'szm-hover-animations' ), initialOpen: false },

						// core/columns: slider of sticky proces-stappen.
						showColumnsFamily && el( SelectControl, {
							label: __( 'Effect', 'szm-hover-animations' ),
							value: columnsEffect,
							options: mapToOptions( GSAP_COLUMNS_OPTIONS_MAP ),
							onChange: handleColumnsEffectChange,
						} ),
						showColumnsFamily && previewFor( columnsEffect && 'columns-' + columnsEffect ),
						showColumnsFamily && columnsEffect === 'slider' && el( RangeControl, {
							label: __( 'Overgangssnelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapSliderSpeed || DEFAULT_SLIDER_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderSpeed: value } );
							},
							min: 100,
							max: 1500,
							step: 50,
						} ),
						showColumnsFamily && columnsEffect === 'slider' && easingControl(),
						showColumnsFamily && columnsEffect === 'slider' && el( ToggleControl, {
							label: __( 'Loop (na laatste slide terug naar eerste)', 'szm-hover-animations' ),
							checked: attributes.szmGsapSliderLoop !== false,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderLoop: value } );
							},
						} ),
						showColumnsFamily && columnsEffect === 'slider' && el( ToggleControl, {
							label: __( 'Automatisch doorschuiven', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapSliderAutoplay,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderAutoplay: value } );
							},
						} ),
						showColumnsFamily && columnsEffect === 'slider' && !! attributes.szmGsapSliderAutoplay && el( RangeControl, {
							label: __( 'Tijd per slide (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapSliderAutoplaySpeed || DEFAULT_SLIDER_AUTOPLAY_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapSliderAutoplaySpeed: value } );
							},
							min: 1500,
							max: 10000,
							step: 500,
						} ),
						showColumnsFamily && columnsEffect === 'process' && pinStartControl(),
						showColumnsFamily && columnsEffect === 'process' && processScrollLengthControl(),
						showColumnsFamily && columnsEffect === 'process' && lockAndCenterControls(),
						showColumnsFamily && columnsEffect === 'process' && el( 'p', { className: 'components-base-control__help' },
							__( 'Bij 2+ kolommen blijft de eerste (bv. afbeelding) vastgepind staan terwijl de directe kind-blokken in de tweede kolom één voor één inklappen. Bij 1 kolom pint de kolom zelf en klappen haar eigen kind-blokken in. Niet live zichtbaar in de editor, alleen op de front-end/preview.', 'szm-hover-animations' )
						),

						// core/group: accordion, horizontal scroll of full-viewport slides.
						showGroupFamily && el( SelectControl, {
							label: __( 'Effect', 'szm-hover-animations' ),
							value: groupEffect,
							options: mapToOptions( GSAP_GROUP_OPTIONS_MAP ),
							onChange: handleGroupEffectChange,
						} ),
						showGroupFamily && previewFor( groupEffect && 'group-' + groupEffect ),
						showGroupFamily && groupEffect === 'accordion' && el( RangeControl, {
							label: __( 'Snelheid (ms)', 'szm-hover-animations' ),
							value: attributes.szmGsapAccordionSpeed || DEFAULT_ACCORDION_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionSpeed: value } );
							},
							min: 100,
							max: 1000,
							step: 50,
						} ),
						showGroupFamily && groupEffect === 'accordion' && easingControl(),
						showGroupFamily && groupEffect === 'accordion' && el( ToggleControl, {
							label: __( 'Meerdere panelen tegelijk open toestaan', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapAccordionMultiple,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionMultiple: value } );
							},
						} ),
						showGroupFamily && groupEffect === 'accordion' && el( RangeControl, {
							label: __( 'Standaard geopend paneel (-1 = alles dicht)', 'szm-hover-animations' ),
							value: typeof attributes.szmGsapAccordionDefaultOpen === 'number' ? attributes.szmGsapAccordionDefaultOpen : -1,
							onChange: function ( value ) {
								setAttributes( { szmGsapAccordionDefaultOpen: value } );
							},
							min: -1,
							max: 10,
							step: 1,
						} ),
						showGroupFamily && groupEffect === 'horizontal' && el( SelectControl, {
							label: __( 'Weergave', 'szm-hover-animations' ),
							value: attributes.szmGsapHorizontalMode || 'scroll',
							options: mapToOptions( HORIZONTAL_MODE_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmGsapHorizontalMode: value } );
							},
						} ),
						showGroupFamily && groupEffect === 'horizontal' && pinStartControl(),
						showGroupFamily && groupEffect === 'horizontal' && lockAndCenterControls(),
						showGroupFamily && groupEffect === 'horizontal' && el( 'p', { className: 'components-base-control__help' },
							__( 'Pint deze Group vast en scrollt zijn directe kind-blokken horizontaal mee met verticaal scrollen ("Zijwaarts scrollen"), of stapelt ze als kaarten op elkaar zonder zijwaartse beweging ("Stapelen"). Niet live zichtbaar in de editor.', 'szm-hover-animations' )
						),
						showGroupFamily && groupEffect === 'fullpage' && el( SelectControl, {
							label: __( 'Overgangsstijl', 'szm-hover-animations' ),
							value: attributes.szmGsapFullpageTransition || 'fade',
							options: mapToOptions( FULLPAGE_TRANSITION_OPTIONS_MAP ),
							onChange: function ( value ) {
								setAttributes( { szmGsapFullpageTransition: value } );
							},
						} ),
						showGroupFamily && groupEffect === 'fullpage' && lockHeadingControl(),
						showGroupFamily && groupEffect === 'fullpage' && el( 'p', { className: 'components-base-control__help' },
							__( 'Elk direct kind-blok wordt een volledig-scherm paneel; scrollen wisselt naar het volgende paneel volgens de gekozen overgangsstijl. Begint altijd direct bovenaan (geen "wanneer begint pinnen"-keuze) — anders past het paneel niet meer op het volledige scherm. Niet live zichtbaar in de editor.', 'szm-hover-animations' )
						),
						showGroupFamily && groupEffect === 'process' && pinStartControl(),
						showGroupFamily && groupEffect === 'process' && processScrollLengthControl(),
						showGroupFamily && groupEffect === 'process' && lockAndCenterControls(),
						showGroupFamily && groupEffect === 'process' && el( 'p', { className: 'components-base-control__help' },
							__( 'Elk direct kind-blok van deze Group is één stap: het eerste element erin blijft zichtbaar als "header", de rest klapt in tijdens scrollen (zelfde vorm als Accordion-panelen). De hele Group pint tijdens dat inklappen. Niet live zichtbaar in de editor.', 'szm-hover-animations' )
						),

						// core/video, core/cover.
						showGsapVideo && el( SelectControl, {
							label: __( 'Video-effect', 'szm-hover-animations' ),
							// "reveal" staat in de Entrance-dropdown (v1.14.0).
							value: attributes.szmGsapVideoEffect === 'reveal' ? '' : ( attributes.szmGsapVideoEffect || '' ),
							options: mapToOptions( GSAP_VIDEO_OPTIONS_MAP ).filter( function ( o ) {
								return o.value !== 'reveal';
							} ),
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoEffect: value } );
							},
						} ),
						showGsapVideo && attributes.szmGsapVideoEffect !== 'reveal' && previewFor( attributes.szmGsapVideoEffect && 'video-' + attributes.szmGsapVideoEffect ),
						showGsapVideo && attributes.szmGsapVideoEffect === 'parallax' && el( RangeControl, {
							label: __( 'Parallax-intensiteit (%)', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || DEFAULT_VIDEO_SPEED,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 5,
							max: 50,
							step: 5,
						} ),
						showGsapVideo && attributes.szmGsapVideoEffect === 'scrub' && el( RangeControl, {
							label: __( 'Scrollafstand (% van schermhoogte)', 'szm-hover-animations' ),
							help: __( 'Hoe ver iemand moet scrollen om de hele video af te spelen. De video wordt vastgepind tijdens het scrubben.', 'szm-hover-animations' ),
							value: attributes.szmGsapVideoSpeed || 200,
							onChange: function ( value ) {
								setAttributes( { szmGsapVideoSpeed: value } );
							},
							min: 100,
							max: 500,
							step: 25,
						} ),
						showGsapVideo && attributes.szmGsapVideoEffect === 'scrub' && pinStartControl(),
						showGsapVideo && attributes.szmGsapVideoEffect === 'scrub' && lockAndCenterControls(),

						// core/button: magnetic.
						showGsapMagnetic && el( ToggleControl, {
							label: __( 'Knop volgt de cursor (magnetisch)', 'szm-hover-animations' ),
							help: __( 'De knop trekt lichtjes mee met de muis binnen zijn eigen omtrek. Op touchscreens (geen cursor) geeft een tik in plaats daarvan een korte "pols"-animatie. Niet live zichtbaar in de editor, alleen op de front-end.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapMagnetic,
							onChange: function ( value ) {
								setAttributes( { szmGsapMagnetic: value } );
							},
						} ),
						!! attributes.szmGsapMagnetic && previewFor( 'magnetic' ),
						showGsapMagnetic && !! attributes.szmGsapMagnetic && el( RangeControl, {
							label: __( 'Trekkracht (px)', 'szm-hover-animations' ),
							value: attributes.szmGsapMagneticStrength || DEFAULT_MAGNETIC_STRENGTH,
							onChange: function ( value ) {
								setAttributes( { szmGsapMagneticStrength: value } );
							},
							min: 10,
							max: 100,
							step: 5,
						} ),
						showGsapMagnetic && !! attributes.szmGsapMagnetic && easingControl(),

						// core/list: infinite marquee.
						showGsapMarquee && el( ToggleControl, {
							label: __( 'Lijst-items eindeloos laten doorschuiven', 'szm-hover-animations' ),
							help: __( 'De lijst-items dupliceren zichzelf en schuiven naadloos in een lus door (logo-strip, testimonials, tags). Pauzeert bij hover; op touchscreens zet een tik pauzeren/doorlopen om. Niet live zichtbaar in de editor.', 'szm-hover-animations' ),
							checked: !! attributes.szmGsapMarquee,
							onChange: function ( value ) {
								setAttributes( { szmGsapMarquee: value } );
							},
						} ),
						!! attributes.szmGsapMarquee && previewFor( 'marquee' ),
						showGsapMarquee && !! attributes.szmGsapMarquee && el( SelectControl, {
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
						showGsapMarquee && !! attributes.szmGsapMarquee && el( RangeControl, {
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
		var name    = blockType.name;

		if ( isHoverSupported( name ) && attributes.szmHoverAnimation ) {
			if ( appliesToChildren( name, attributes, 'hover' ) ) {
				// frontend.js zet szm-hover-{variant} op de kind-blokken; de
				// CSS-variabelen hieronder erven ze van dit blok.
				classes.push( 'szm-hover-children' );
				extraProps[ 'data-szm-hover-children' ] = attributes.szmHoverAnimation;
			} else {
				classes.push( 'szm-hover', classForHover( attributes.szmHoverAnimation ) );
			}
			style[ '--szm-hover-speed' ] = ( attributes.szmHoverSpeed || DEFAULT_HOVER_SPEED ) + 'ms';
			style[ '--szm-hover-ease' ]  = EASE_CSS_MAP[ attributes.szmHoverEasing || DEFAULT_EASING ] || EASE_CSS_MAP[ DEFAULT_EASING ];
		}

		if ( isHoverSupported( name ) && attributes.szmHoverGroup ) {
			classes.push( 'szm-hover-group' );
		}

		if ( isEntranceSupported( name ) && attributes.szmEntranceAnimation ) {
			if ( appliesToChildren( name, attributes, 'entrance' ) ) {
				// frontend.js zet szm-entrance-{variant} op de kind-blokken en
				// rekent daar de stagger-vertraging uit (geen vaste delay hier).
				classes.push( 'szm-entrance-children' );
				extraProps[ 'data-szm-entrance-children' ] = attributes.szmEntranceAnimation;
				extraProps[ 'data-szm-stagger' ]           = attributes.szmEntranceStaggerStep || 0;
			} else {
				classes.push( 'szm-entrance', classForEntrance( attributes.szmEntranceAnimation ) );
			}
			// Volgorde van deze keys niet wijzigen: bepaalt de opgeslagen style-
			// string, anders block recovery op al gepubliceerde blokken.
			style[ '--szm-entrance-speed' ] = ( attributes.szmEntranceSpeed || DEFAULT_ENTRANCE_SPEED ) + 'ms';
			if ( ! appliesToChildren( name, attributes, 'entrance' ) ) {
				style[ '--szm-entrance-delay' ] = ( attributes.szmEntranceDelay || 0 ) + 'ms';
			}
			style[ '--szm-entrance-ease' ]  = EASE_CSS_MAP[ attributes.szmEntranceEasing || DEFAULT_EASING ] || EASE_CSS_MAP[ DEFAULT_EASING ];
			if ( typeof attributes.szmEntranceDistance === 'number' ) {
				style[ '--szm-entrance-distance' ] = attributes.szmEntranceDistance + 'px';
			}
		}

		// core/columns: slider XOR sticky proces-stappen, via het nieuwe
		// szmGsapEffect-attribute met fallback op de oude losse toggles voor
		// content die is opgeslagen vóór v1.9.0 (zie legacyColumnsEffect).
		if ( isColumnsFamily( name ) ) {
			var columnsEffect = attributes.szmGsapEffect || legacyColumnsEffect( attributes );

			if ( columnsEffect === 'slider' ) {
				classes.push( 'szm-gsap-slider' );
				extraProps[ 'data-szm-slider-speed' ]          = attributes.szmGsapSliderSpeed || DEFAULT_SLIDER_SPEED;
				extraProps[ 'data-szm-slider-autoplay' ]       = !! attributes.szmGsapSliderAutoplay;
				extraProps[ 'data-szm-slider-autoplay-speed' ] = attributes.szmGsapSliderAutoplaySpeed || DEFAULT_SLIDER_AUTOPLAY_SPEED;
				extraProps[ 'data-szm-slider-loop' ]           = attributes.szmGsapSliderLoop !== false;
				extraProps[ 'data-szm-ease' ]                  = attributes.szmGsapEasing || DEFAULT_EASING;
			} else if ( columnsEffect === 'process' ) {
				classes.push( 'szm-gsap-process' );
				extraProps[ 'data-szm-pin-start' ]     = attributes.szmGsapPinStart || DEFAULT_PIN_START;
				extraProps[ 'data-szm-scroll-length' ] = attributes.szmGsapProcessScrollLength || DEFAULT_PROCESS_SCROLL_LENGTH;
				extraProps[ 'data-szm-lock-heading' ]  = !! attributes.szmGsapLockHeading;
				extraProps[ 'data-szm-vertical-center' ] = !! attributes.szmGsapVerticalCenter;
			}
		}

		// core/group: accordion, horizontal scroll, full-viewport slides of
		// proces-stappen — zelfde patroon, fallback op de oude toggles via
		// legacyGroupEffect (process heeft geen legacy boolean, is nieuw).
		if ( isGroupFamily( name ) ) {
			var groupEffect = attributes.szmGsapEffect || legacyGroupEffect( attributes );

			if ( groupEffect === 'accordion' ) {
				classes.push( 'szm-gsap-accordion' );
				extraProps[ 'data-szm-accordion-speed' ]        = attributes.szmGsapAccordionSpeed || DEFAULT_ACCORDION_SPEED;
				extraProps[ 'data-szm-accordion-multiple' ]     = !! attributes.szmGsapAccordionMultiple;
				extraProps[ 'data-szm-accordion-default-open' ] = typeof attributes.szmGsapAccordionDefaultOpen === 'number' ? attributes.szmGsapAccordionDefaultOpen : -1;
				extraProps[ 'data-szm-ease' ]                   = attributes.szmGsapEasing || DEFAULT_EASING;
			} else if ( groupEffect === 'horizontal' ) {
				classes.push( 'szm-gsap-horizontal' );
				extraProps[ 'data-szm-pin-start' ]       = attributes.szmGsapPinStart || DEFAULT_PIN_START;
				extraProps[ 'data-szm-horizontal-mode' ] = attributes.szmGsapHorizontalMode || 'scroll';
				extraProps[ 'data-szm-lock-heading' ]    = !! attributes.szmGsapLockHeading;
				extraProps[ 'data-szm-vertical-center' ] = !! attributes.szmGsapVerticalCenter;
			} else if ( groupEffect === 'fullpage' ) {
				classes.push( 'szm-gsap-fullpage' );
				// Bewust geen data-szm-pin-start: full-viewport slides moeten altijd
				// exact bovenaan pinnen, anders past het paneel niet meer op het
				// volledige scherm. gsap-effects.js corrigeert hier nog wel
				// automatisch voor een sticky header/adminbalk.
				extraProps[ 'data-szm-fullpage-transition' ] = attributes.szmGsapFullpageTransition || 'fade';
				extraProps[ 'data-szm-lock-heading' ]        = !! attributes.szmGsapLockHeading;
			} else if ( groupEffect === 'process' ) {
				classes.push( 'szm-gsap-process' );
				extraProps[ 'data-szm-pin-start' ]       = attributes.szmGsapPinStart || DEFAULT_PIN_START;
				extraProps[ 'data-szm-scroll-length' ]   = attributes.szmGsapProcessScrollLength || DEFAULT_PROCESS_SCROLL_LENGTH;
				extraProps[ 'data-szm-lock-heading' ]    = !! attributes.szmGsapLockHeading;
				extraProps[ 'data-szm-vertical-center' ] = !! attributes.szmGsapVerticalCenter;
			}
		}

		if ( isGsapVideoSupported( name ) && attributes.szmGsapVideoEffect ) {
			classes.push( classForGsapVideo( attributes.szmGsapVideoEffect ) );
			extraProps[ 'data-szm-video-speed' ] = attributes.szmGsapVideoSpeed || DEFAULT_VIDEO_SPEED;

			if ( attributes.szmGsapVideoEffect === 'scrub' ) {
				extraProps[ 'data-szm-pin-start' ]       = attributes.szmGsapPinStart || DEFAULT_PIN_START;
				extraProps[ 'data-szm-lock-heading' ]    = !! attributes.szmGsapLockHeading;
				extraProps[ 'data-szm-vertical-center' ] = !! attributes.szmGsapVerticalCenter;
			}
			if ( attributes.szmGsapVideoEffect === 'reveal' ) {
				extraProps[ 'data-szm-ease' ] = attributes.szmGsapEasing || DEFAULT_EASING;
			}
		}

		if ( isGsapTextSupported( name ) && attributes.szmGsapText ) {
			classes.push( 'szm-gsap-text', classForGsapText( attributes.szmGsapText ) );
			extraProps[ 'data-szm-text-speed' ]   = attributes.szmGsapTextSpeed || DEFAULT_TEXT_SPEED;
			extraProps[ 'data-szm-text-stagger' ] = attributes.szmGsapTextStagger || DEFAULT_TEXT_STAGGER;
			extraProps[ 'data-szm-ease' ]         = attributes.szmGsapEasing || DEFAULT_EASING;
			extraProps[ 'data-szm-loop' ]         = attributes.szmGsapLoop !== false;
			extraProps[ 'data-szm-loop-delay' ]   = attributes.szmGsapLoopDelay || DEFAULT_LOOP_DELAY;
		}

		if ( isGsapCounterSupported( name ) && attributes.szmGsapCounter ) {
			classes.push( 'szm-gsap-counter' );
			extraProps[ 'data-szm-counter-speed' ] = attributes.szmGsapCounterSpeed || DEFAULT_COUNTER_SPEED;
			// Heading zit sowieso al in de tekst-reveal-familie, dus szmGsapEasing
			// staat al geregistreerd — hergebruik 'm hier zodat de counter niet
			// zijn eigen losse easing-instelling nodig heeft.
			extraProps[ 'data-szm-ease' ]       = attributes.szmGsapEasing || DEFAULT_EASING;
			extraProps[ 'data-szm-loop' ]       = attributes.szmGsapLoop !== false;
			extraProps[ 'data-szm-loop-delay' ] = attributes.szmGsapLoopDelay || DEFAULT_LOOP_DELAY;
		}

		if ( isGsapMagneticSupported( name ) && attributes.szmGsapMagnetic ) {
			classes.push( 'szm-gsap-magnetic' );
			extraProps[ 'data-szm-magnetic-strength' ] = attributes.szmGsapMagneticStrength || DEFAULT_MAGNETIC_STRENGTH;
			extraProps[ 'data-szm-ease' ]               = attributes.szmGsapEasing || DEFAULT_EASING;
		}

		if ( isGsapMarqueeSupported( name ) && attributes.szmGsapMarquee ) {
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
			var showHover    = isHoverSupported( name ) && !! attributes.szmHoverAnimation && ! appliesToChildren( name, attributes, 'hover' );
			var showHoverGroup = isHoverSupported( name ) && !! attributes.szmHoverGroup;
			var showEntrance = isEntranceSupported( name ) && !! attributes.szmEntranceAnimation && ! appliesToChildren( name, attributes, 'entrance' );

			if ( ! showHover && ! showHoverGroup && ! showEntrance ) {
				return el( BlockListBlock, props );
			}

			var classes = [ props.wrapperProps && props.wrapperProps.className ];
			var style   = Object.assign( {}, props.wrapperProps && props.wrapperProps.style );

			if ( showHover ) {
				classes.push( 'szm-hover', classForHover( attributes.szmHoverAnimation ) );
				style[ '--szm-hover-speed' ] = ( attributes.szmHoverSpeed || DEFAULT_HOVER_SPEED ) + 'ms';
				style[ '--szm-hover-ease' ]  = EASE_CSS_MAP[ attributes.szmHoverEasing || DEFAULT_EASING ] || EASE_CSS_MAP[ DEFAULT_EASING ];
			}

			if ( showHoverGroup ) {
				classes.push( 'szm-hover-group' );
			}

			if ( showEntrance ) {
				classes.push( 'szm-entrance', 'szm-entrance-revealed', classForEntrance( attributes.szmEntranceAnimation ) );
				style[ '--szm-entrance-speed' ] = ( attributes.szmEntranceSpeed || DEFAULT_ENTRANCE_SPEED ) + 'ms';
				style[ '--szm-entrance-delay' ] = ( attributes.szmEntranceDelay || 0 ) + 'ms';
				style[ '--szm-entrance-ease' ]  = EASE_CSS_MAP[ attributes.szmEntranceEasing || DEFAULT_EASING ] || EASE_CSS_MAP[ DEFAULT_EASING ];
				if ( typeof attributes.szmEntranceDistance === 'number' ) {
					style[ '--szm-entrance-distance' ] = attributes.szmEntranceDistance + 'px';
				}
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
