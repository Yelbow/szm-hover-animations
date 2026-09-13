<?php
/**
 * Plugin Name: SZM Hover Animations
 * Description: Voegt "Hover animatie" en "Entrance animatie" dropdowns toe aan de block-instellingen (site editor) van Group-, Cover-, Column- en Columns-blokken, inclusief snelheid en stagger-vertraging.
 * Version: 1.1.0
 * Author: Studio Zonder Meer
 * Text Domain: szm-hover-animations
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SZM_HA_VERSION', '1.1.0' );
define( 'SZM_HA_DIR', plugin_dir_path( __FILE__ ) );
define( 'SZM_HA_URL', plugin_dir_url( __FILE__ ) );

/**
 * Welke hover-animaties zijn beschikbaar. value = ook de opgeslagen attribute-waarde
 * en de class-suffix (szm-hover-{value}). Pas hier aan om opties toe te voegen/verwijderen.
 */
function szm_ha_get_animations() {
	return array(
		''         => __( 'Geen', 'szm-hover-animations' ),
		'lift'     => __( 'Optillen', 'szm-hover-animations' ),
		'zoom-in'  => __( 'Inzoomen', 'szm-hover-animations' ),
		'zoom-out' => __( 'Uitzoomen', 'szm-hover-animations' ),
		'fade'     => __( 'Vervagen', 'szm-hover-animations' ),
		'glow'     => __( 'Gloed', 'szm-hover-animations' ),
		'tilt'     => __( 'Kantelen', 'szm-hover-animations' ),
		'shadow'   => __( 'Schaduw uitlichten', 'szm-hover-animations' ),
	);
}

/**
 * Welke entrance-animaties (bij scrollen in beeld) beschikbaar zijn. value = ook de
 * opgeslagen attribute-waarde en de class-suffix (szm-entrance-{value}).
 */
function szm_ha_get_entrance_animations() {
	return array(
		''          => __( 'Geen', 'szm-hover-animations' ),
		'fade-in'   => __( 'Fade in', 'szm-hover-animations' ),
		'slide-up'  => __( 'Op laten schuiven', 'szm-hover-animations' ),
	);
}

/**
 * Editor-script: voegt attributes, inspector-dropdowns en editor-preview classes toe.
 */
function szm_ha_enqueue_editor_assets() {
	$deps = array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-hooks', 'wp-i18n', 'wp-compose', 'wp-data' );

	wp_enqueue_script(
		'szm-ha-editor',
		SZM_HA_URL . 'assets/editor.js',
		$deps,
		SZM_HA_VERSION,
		true
	);

	wp_localize_script(
		'szm-ha-editor',
		'szmHoverAnimations',
		array(
			'options'         => szm_ha_get_animations(),
			'entranceOptions' => szm_ha_get_entrance_animations(),
			// Welke blokken de hover-dropdown krijgen. Uitbreidbaar via de php-filter hieronder.
			'blocks'          => apply_filters( 'szm_ha_supported_blocks', array( 'core/group', 'core/cover', 'core/column' ) ),
			// Welke blokken de entrance-dropdown (+ snelheid/stagger) krijgen.
			'entranceBlocks'  => apply_filters( 'szm_ha_supported_entrance_blocks', array( 'core/group', 'core/cover', 'core/column', 'core/columns' ) ),
		)
	);

	wp_enqueue_style(
		'szm-ha-editor-style',
		SZM_HA_URL . 'assets/style.css',
		array(),
		SZM_HA_VERSION
	);
}
add_action( 'enqueue_block_editor_assets', 'szm_ha_enqueue_editor_assets' );

/**
 * Front-end: dezelfde animatie-CSS laden zodat de hover en entrance-animaties
 * ook op de live site werken, plus het script dat entrance-animaties triggert
 * zodra een blok in beeld scrollt.
 */
function szm_ha_enqueue_frontend_assets() {
	wp_enqueue_style(
		'szm-ha-style',
		SZM_HA_URL . 'assets/style.css',
		array(),
		SZM_HA_VERSION
	);

	wp_enqueue_script(
		'szm-ha-frontend',
		SZM_HA_URL . 'assets/frontend.js',
		array(),
		SZM_HA_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'szm_ha_enqueue_frontend_assets' );
