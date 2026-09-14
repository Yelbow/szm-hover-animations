<?php
/**
 * Plugin Name: SZM Hover Animations
 * Description: Voegt "Hover animatie" en "Entrance animatie" dropdowns toe aan de block-instellingen (site editor), plus een volledige GSAP-module: slider (Columns), accordion (Group), horizontal scroll (Group), full-viewport scroll slides (Group), video parallax/reveal/play-on-scroll/scrub (Video/Cover), tekst-reveal met SplitText (Heading/Paragraph), animated counters (Heading), magnetic button (Button) en infinite marquee (List). Alles mobiel-getest, allemaal gegraft op bestaande core-blokken — geen nieuwe blokken.
 * Version: 1.6.0
 * Author: Studio Zonder Meer
 * Text Domain: szm-hover-animations
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SZM_HA_VERSION', '1.6.0' );
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
 * Welke video-effecten (GSAP) beschikbaar zijn voor Video/Cover-blokken.
 * value = ook de opgeslagen attribute-waarde en de class-suffix (szm-gsap-video-{value}).
 */
function szm_ha_get_gsap_video_effects() {
	return array(
		''               => __( 'Geen', 'szm-hover-animations' ),
		'parallax'       => __( 'Parallax (bij scrollen)', 'szm-hover-animations' ),
		'reveal'         => __( 'Inzoomen bij in beeld komen', 'szm-hover-animations' ),
		'play-on-scroll' => __( 'Afspelen/pauzeren bij in/uit beeld', 'szm-hover-animations' ),
		'scrub'          => __( 'Scrollen = afspelen (filmstrook, gepind)', 'szm-hover-animations' ),
	);
}

/**
 * Welke tekst-reveal varianten (GSAP SplitText) beschikbaar zijn voor
 * Heading/Paragraph-blokken. value = ook de opgeslagen attribute-waarde en
 * de class-suffix (szm-gsap-text-{value}).
 */
function szm_ha_get_gsap_text_effects() {
	return array(
		''       => __( 'Geen', 'szm-hover-animations' ),
		'chars'  => __( 'Per letter', 'szm-hover-animations' ),
		'words'  => __( 'Per woord', 'szm-hover-animations' ),
		'lines'  => __( 'Per regel', 'szm-hover-animations' ),
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
			// GSAP-module: geen nieuwe blokken, gedrag toegevoegd aan bestaande blokken.
			'gsapVideoOptions' => szm_ha_get_gsap_video_effects(),
			// Welk blok slider-gedrag krijgt (kolommen worden slides).
			'gsapSliderBlocks' => apply_filters( 'szm_ha_gsap_slider_blocks', array( 'core/columns' ) ),
			// Welk blok accordion-gedrag krijgt (directe kind-blokken worden panels).
			'gsapAccordionBlocks' => apply_filters( 'szm_ha_gsap_accordion_blocks', array( 'core/group' ) ),
			// Welke blokken video-effecten krijgen.
			'gsapVideoBlocks'  => apply_filters( 'szm_ha_gsap_video_blocks', array( 'core/video', 'core/cover' ) ),
			// Tekst-reveal (SplitText): welke blokken de dropdown krijgen.
			'gsapTextOptions'  => szm_ha_get_gsap_text_effects(),
			'gsapTextBlocks'   => apply_filters( 'szm_ha_gsap_text_blocks', array( 'core/heading', 'core/paragraph' ) ),
			// Animated counters: alleen Heading (getal in de tekst wordt geteld).
			'gsapCounterBlocks' => apply_filters( 'szm_ha_gsap_counter_blocks', array( 'core/heading' ) ),
			// Magnetic button: cursor-volgend knop-effect.
			'gsapMagneticBlocks' => apply_filters( 'szm_ha_gsap_magnetic_blocks', array( 'core/button' ) ),
			// Horizontal scroll: Group met vastgepinde horizontale scroll door de kinderen.
			// Let op: sluit elkaar uit met de accordion-toggle op hetzelfde blok; als beide aan
			// staan wint de accordion (zie withAnimationControls in editor.js).
			'gsapHorizontalBlocks' => apply_filters( 'szm_ha_gsap_horizontal_blocks', array( 'core/group' ) ),
			// Full-viewport scroll slides: Group waarvan de kinderen elk een volledig
			// scherm innemen en in elkaar overvloeien. Sluit ook uit met accordion én
			// horizontal scroll op hetzelfde blok (prioriteit: accordion > horizontal > fullpage).
			'gsapFullpageBlocks' => apply_filters( 'szm_ha_gsap_fullpage_blocks', array( 'core/group' ) ),
			// Infinite marquee: List-items schuiven eindeloos door.
			'gsapMarqueeBlocks' => apply_filters( 'szm_ha_gsap_marquee_blocks', array( 'core/list' ) ),
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

	// GSAP-module (slider/accordion/video). Vendored locally, geen CDN-afhankelijkheid.
	// Filterbaar zodat een site die geen van deze effecten gebruikt het kan uitschakelen.
	if ( apply_filters( 'szm_ha_load_gsap', true ) ) {
		wp_enqueue_script(
			'szm-ha-gsap',
			SZM_HA_URL . 'assets/vendor/gsap/gsap.min.js',
			array(),
			'3.15.0',
			true
		);

		wp_enqueue_script(
			'szm-ha-gsap-scrolltrigger',
			SZM_HA_URL . 'assets/vendor/gsap/ScrollTrigger.min.js',
			array( 'szm-ha-gsap' ),
			'3.15.0',
			true
		);

		wp_enqueue_script(
			'szm-ha-gsap-splittext',
			SZM_HA_URL . 'assets/vendor/gsap/SplitText.min.js',
			array( 'szm-ha-gsap' ),
			'3.15.0',
			true
		);

		wp_enqueue_script(
			'szm-ha-gsap-effects',
			SZM_HA_URL . 'assets/gsap-effects.js',
			array( 'szm-ha-gsap', 'szm-ha-gsap-scrolltrigger', 'szm-ha-gsap-splittext' ),
			SZM_HA_VERSION,
			true
		);
	}
}
add_action( 'wp_enqueue_scripts', 'szm_ha_enqueue_frontend_assets' );

/**
 * Self-updates through WordPress's native Plugins/Updates screen — no
 * separate updater plugin needed. Checks the GitHub repo for new tags and
 * shows the normal "Update available" notice, same as the other SZM plugins.
 */
require_once __DIR__ . '/inc/plugin-update-checker/plugin-update-checker.php';
use YahnisElsts\PluginUpdateChecker\v5p4\PucFactory;
add_action( 'init', function () {
	$update_checker = PucFactory::buildUpdateChecker(
		'https://github.com/Yelbow/szm-hover-animations',
		__FILE__,
		'szm-hover-animations'
	);
	$update_checker->setBranch( 'main' );
	// If the repo is private, uncomment and set a fine-grained,
	// read-only-on-this-repo GitHub access token:
	// $update_checker->setAuthentication( 'ghp_xxxxxxxxxxxxxxxxxxxx' );
} );
