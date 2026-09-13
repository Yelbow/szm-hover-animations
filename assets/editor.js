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
	var __                      = wp.i18n.__;

	var HOVER_BLOCKS       = settings.blocks || [];
	var ENTRANCE_BLOCKS    = settings.entranceBlocks || [];
	var HOVER_OPTIONS_MAP  = settings.options || {};
	var ENTRANCE_OPTIONS_MAP = settings.entranceOptions || {};

	var DEFAULT_HOVER_SPEED    = 250; // ms
	var DEFAULT_ENTRANCE_SPEED = 500; // ms

	function isHoverSupported( name ) {
		return HOVER_BLOCKS.indexOf( name ) !== -1;
	}

	function isEntranceSupported( name ) {
		return ENTRANCE_BLOCKS.indexOf( name ) !== -1;
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

			if ( ! showHover && ! showEntrance ) {
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
