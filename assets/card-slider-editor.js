/**
 * Attributen van de Kaartenslider voor het Berichtsjabloon (Query Loop): bestaande inhoud slaat ze daar op.
 * Het paneel staat sinds v1.16.0 in "Scroll & interactie" (assets/editor.js), op de Query Loop en op de Rij/Groep,
 * dus op het blok dat je ook aanklikt. Dit bestand doet alleen nog de attributen.
 */
( function ( wp ) {
	var cfg = window.szmCardSliderEditor || {};
	if ( ! cfg.canManage ) { return; }
	var el = wp.element.createElement;
	var BLOKKEN = [ 'core/query', 'core/group', 'core/post-template' ];

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

	// Paneel "Kaartenslider": eigen paneel, zodat het paneel "Scroll & interactie" van de
	// animaties (Effect-keuzemenu + voorbeeldfilmpjes) precies blijft zoals het was.
	wp.hooks.addFilter( 'editor.BlockEdit', 'szm-ha/card-slider-paneel', function ( BlockEdit ) {
		return function ( props ) {
			var bewerken = el( BlockEdit, props );
			if ( BLOKKEN.indexOf( props.name ) === -1 ) { return bewerken; }
			var a = props.attributes, set = props.setAttributes, C = wp.components;
			var waar = props.name === 'core/query' ? 'de lijst met kaartjes in deze Query Loop'
				: props.name === 'core/post-template' ? 'de lijst met berichten hieronder'
				: 'de kaartjes in deze rij';
			var veld = function ( key, label, help, standaard ) {
				return el( C.TextControl, { key: key, type: 'number', min: 0, label: label, help: help,
					placeholder: String( standaard ), value: a[ key ] || '',
					__nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
					onChange: function ( v ) { var o = {}; o[ key ] = v; set( o ); } } );
			};
			return el( wp.element.Fragment, null, bewerken,
				el( wp.blockEditor.InspectorControls, null,
					el( C.PanelBody, { title: 'Kaartenslider', initialOpen: !! a.szmSlider },
						el( C.ToggleControl, {
							label: 'Slider aan of uit',
							checked: !! a.szmSlider,
							help: 'Aan: ' + waar + ' wordt op de website een slider die oneindig doorbladert, met pijltjes, bolletjes en vegen. Uit: het blijft een gewoon raster. In de editor zie je altijd een lijst, de slider zie je op de website.',
							onChange: function ( v ) { set( { szmSlider: v } ); },
						} ),
						el( 'p', { className: 'components-base-control__help', style: { marginTop: 0 } },
							a.szmSlider ? 'Staat nu AAN voor dit blok. Instellen:'
								: 'Staat nu UIT voor dit blok. Zet de schakelaar aan om te kunnen instellen.' ),
						a.szmSlider ? el( 'div', { style: { display: 'grid', gap: '12px', marginTop: '8px' } },
							veld( 'szmSliderGrens', 'Grens (aantal kaarten)', 'Meer kaartjes dan dit wordt een slider. Leeg = standaard (' + cfg.threshold + ').', cfg.threshold ),
							veld( 'szmSliderSeconden', 'Seconden per kaart', 'Automatisch doorgaan. 0 = niet automatisch. Leeg = standaard (' + cfg.autoplay + ').', cfg.autoplay ),
							veld( 'szmSliderSnelheid', 'Overgangssnelheid (ms)', 'Hoe snel de kaarten verschuiven. Leeg = standaard (' + cfg.speed + ').', cfg.speed ),
							el( 'a', { href: cfg.settingsUrl }, 'Standaardwaarden: Instellingen > Kaartenslider' )
						) : null
					)
				)
			);
		};
	}, 20 );
} )( window.wp );
