( function ( wp, settings ) {
	if ( ! wp || ! settings ) {
		return;
	}

	var addFilter               = wp.hooks.addFilter;
	var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
	var Fragment                = wp.element.Fragment;
	var el                      = wp.element.createElement;
	var InspectorControls       = wp.blockEditor.InspectorControls;
	var PanelBody               = wp.components.PanelBody;
	var SelectControl           = wp.components.SelectControl;
	var __                      = wp.i18n.__;

	var SUPPORTED_BLOCKS = settings.blocks || [];
	var OPTIONS_MAP      = settings.options || {};

	function isSupported( name ) {
		return SUPPORTED_BLOCKS.indexOf( name ) !== -1;
	}

	function getOptions() {
		return Object.keys( OPTIONS_MAP ).map( function ( value ) {
			return { value: value, label: OPTIONS_MAP[ value ] };
		} );
	}

	function classForAnimation( value ) {
		return value ? 'szm-hover-' + value : '';
	}

	/**
	 * 1. Attribute registreren op de ondersteunde blokken.
	 */
	function addHoverAnimationAttribute( blockSettings, name ) {
		if ( ! isSupported( name ) ) {
			return blockSettings;
		}

		blockSettings.attributes = Object.assign( {}, blockSettings.attributes, {
			szmHoverAnimation: {
				type: 'string',
				default: '',
			},
		} );

		return blockSettings;
	}
	addFilter(
		'blocks.registerBlockType',
		'szm-hover-animations/add-attribute',
		addHoverAnimationAttribute
	);

	/**
	 * 2. Dropdown toevoegen aan het instellingenpaneel (Inspector) van de site editor.
	 */
	var withHoverAnimationControl = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( ! isSupported( props.name ) ) {
				return el( BlockEdit, props );
			}

			var attributes  = props.attributes;
			var setAttributes = props.setAttributes;

			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Hover animatie', 'szm-hover-animations' ), initialOpen: true },
						el( SelectControl, {
							label: __( 'Animatie bij hover', 'szm-hover-animations' ),
							value: attributes.szmHoverAnimation || '',
							options: getOptions(),
							onChange: function ( value ) {
								setAttributes( { szmHoverAnimation: value } );
							},
						} )
					)
				)
			);
		};
	}, 'withHoverAnimationControl' );
	addFilter(
		'editor.BlockEdit',
		'szm-hover-animations/add-control',
		withHoverAnimationControl
	);

	/**
	 * 3. Class toevoegen aan de opgeslagen markup (front-end).
	 */
	function addSaveProps( extraProps, blockType, attributes ) {
		if ( ! isSupported( blockType.name ) || ! attributes.szmHoverAnimation ) {
			return extraProps;
		}

		extraProps.className = ( extraProps.className ? extraProps.className + ' ' : '' )
			+ 'szm-hover ' + classForAnimation( attributes.szmHoverAnimation );

		return extraProps;
	}
	addFilter(
		'blocks.getSaveContent.extraProps',
		'szm-hover-animations/add-save-props',
		addSaveProps
	);

	/**
	 * 4. Class ook in de editor-canvas zelf tonen, zodat je de animatie meteen ziet.
	 */
	var withHoverAnimationPreview = createHigherOrderComponent( function ( BlockListBlock ) {
		return function ( props ) {
			if ( ! isSupported( props.name ) || ! props.attributes.szmHoverAnimation ) {
				return el( BlockListBlock, props );
			}

			var wrapperProps = Object.assign( {}, props.wrapperProps, {
				className: [
					props.wrapperProps && props.wrapperProps.className,
					'szm-hover',
					classForAnimation( props.attributes.szmHoverAnimation ),
				].filter( Boolean ).join( ' ' ),
			} );

			return el( BlockListBlock, Object.assign( {}, props, { wrapperProps: wrapperProps } ) );
		};
	}, 'withHoverAnimationPreview' );
	addFilter(
		'editor.BlockListBlock',
		'szm-hover-animations/add-preview',
		withHoverAnimationPreview
	);
} )( window.wp, window.szmHoverAnimations );
