/**
 * Attributen van de Kaartenslider voor het Berichtsjabloon (Query Loop): bestaande inhoud slaat ze daar op.
 * Het paneel staat sinds v1.16.0 in "Scroll & interactie" (assets/editor.js), op de Query Loop en op de Rij/Groep,
 * dus op het blok dat je ook aanklikt. Dit bestand doet alleen nog de attributen.
 */
( function ( wp ) {
	var cfg = window.szmCardSliderEditor || {};
	if ( ! cfg.canManage ) { return; }
	var BLOKKEN = [ 'core/post-template' ];

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
} )( window.wp );
