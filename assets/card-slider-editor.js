/**
 * Blokpaneel "Kaartenslider" (alleen voor beheerders) op Berichtsjabloon (Query Loop) en Groep/Rij.
 * Zet attributen szmSlider, szmSliderGrens, szmSliderSeconden, szmSliderSnelheid. De website voegt daar server-side
 * de klasse .szm-card-slider en de data-attributen aan toe (zie szm-hover-animations.php), card-slider.js doet de rest.
 */
( function ( wp ) {
	var cfg = window.szmCardSliderEditor || {};
	if ( ! cfg.canManage ) { return; }
	var el = wp.element.createElement, __ = wp.i18n.__;
	var BLOKKEN = [ 'core/post-template', 'core/group' ];

	wp.hooks.addFilter( 'blocks.registerBlockType', 'szm-ha/card-slider-attrs', function ( settings, name ) {
		if ( BLOKKEN.indexOf( name ) === -1 ) { return settings; }
		settings.attributes = Object.assign( {}, settings.attributes, {
			szmSlider: { type: 'boolean', default: false },
			szmSliderGrens: { type: 'string', default: '' },
			szmSliderSeconden: { type: 'string', default: '' },
			szmSliderSnelheid: { type: 'string', default: '' }
		} );
		return settings;
	} );

	wp.hooks.addFilter( 'editor.BlockEdit', 'szm-ha/card-slider-panel', function ( BlockEdit ) {
		return function ( props ) {
			var edit = el( BlockEdit, props );
			if ( BLOKKEN.indexOf( props.name ) === -1 ) { return edit; }
			var a = props.attributes, set = props.setAttributes, C = wp.components;
			var veld = function ( key, label, help, ph ) {
				return el( C.TextControl, { key: key, type: 'number', min: 0, label: label, help: help, placeholder: ph, value: a[ key ] || '',
					__nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
					onChange: function ( v ) { var o = {}; o[ key ] = v; set( o ); } } );
			};
			return el( wp.element.Fragment, null, edit,
				el( wp.blockEditor.InspectorControls, null,
					el( C.PanelBody, { title: 'Kaartenslider', initialOpen: !! a.szmSlider },
						el( C.ToggleControl, { __nextHasNoMarginBottom: true, label: 'Slider als er veel kaarten zijn', checked: !! a.szmSlider,
							help: 'Op de website wordt deze lijst een automatische, oneindige slider zodra er meer kaarten zijn dan de grens. Eén kaart per keer. Op mobiel steekt de volgende kaart uit. Zie de preview op de website, in de editor blijft het een lijst.',
							onChange: function ( v ) { set( { szmSlider: v } ); } } ),
						a.szmSlider ? el( 'div', { style: { display: 'grid', gap: '12px', marginTop: '12px' } },
							veld( 'szmSliderGrens', 'Grens (aantal kaarten)', 'Meer kaarten dan dit wordt een slider. Leeg = standaard (' + cfg.threshold + ').', String( cfg.threshold ) ),
							veld( 'szmSliderSeconden', 'Seconden per kaart', 'Leeg = standaard (' + cfg.autoplay + '). 0 = niet automatisch.', String( cfg.autoplay ) ),
							veld( 'szmSliderSnelheid', 'Overgangssnelheid (ms)', 'Leeg = standaard (' + cfg.speed + ').', String( cfg.speed ) ),
							el( 'a', { href: cfg.settingsUrl }, 'Standaardwaarden: Instellingen > Kaartenslider' )
						) : null
					)
				)
			);
		};
	}, 20 );
} )( window.wp );
