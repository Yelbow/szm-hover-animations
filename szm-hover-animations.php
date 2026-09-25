<?php
/**
 * Plugin Name: SZM Hover Animations
 * Description: Eén "Hover animatie", "Entrance animatie" en "GSAP effect"-paneel per blok in de block-instellingen (site editor) — de GSAP-dropdown toont alleen de effecten die voor dat bloktype gelden en, na kiezen, alleen de bijpassende instellingen (slider/sticky proces-stappen op Columns, accordion/horizontal scroll/full-viewport slides/sticky proces-stappen op Group, video parallax/reveal/play-on-scroll/scrub op Video/Cover, tekst-reveal met SplitText op Heading/Paragraph, animated counter op Heading, magnetic button op Button, infinite marquee op List). Gepinde scroll-effecten corrigeren automatisch voor een sticky header/WP-adminbalk, mogen verticaal centreren i.p.v. vastpinnen tegen de bovenkant, en kunnen optioneel het blok erboven mee laten vastzetten. Tekst-reveal/counter herhalen zichzelf na een instelbare wachttijd zolang ze in beeld blijven. Alles mobiel-getest, allemaal gegraft op bestaande core-blokken — geen nieuwe blokken.
 * Version: 1.14.0
 * Author: Studio Zonder Meer
 * Text Domain: szm-hover-animations
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SZM_HA_VERSION', '1.14.0' );
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
		'darken'   => __( 'Verdonkeren (editorial overlay)', 'szm-hover-animations' ),
		'spread'   => __( 'Uit elkaar schuiven (gap tussen kinderen, bv. tekst + pijl)', 'szm-hover-animations' ),
		'reveal'   => __( 'Onthullen (verborgen tot hover-groep gehoverd wordt)', 'szm-hover-animations' ),
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
		// Naar nixowebbuilding.nl (04A): korter, subtieler, eerder getriggerd.
		'reveal'    => __( 'Fade-in reveal (kort en subtiel)', 'szm-hover-animations' ),
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
 * Welke GSAP-effecten beschikbaar zijn voor een core/columns-blok. Eén
 * dropdown i.p.v. losse aan/uit-toggles per effect — sluiten elkaar toch al
 * uit (zie addSaveProps in editor.js).
 */
function szm_ha_get_gsap_columns_effects() {
	return array(
		''        => __( 'Geen', 'szm-hover-animations' ),
		'slider'  => __( 'Slider', 'szm-hover-animations' ),
		'process' => __( 'Sticky proces-stappen', 'szm-hover-animations' ),
	);
}

/**
 * Welke GSAP-effecten beschikbaar zijn voor een core/group-blok. Zelfde
 * reden als hierboven: al mutually exclusive, dus één dropdown.
 */
function szm_ha_get_gsap_group_effects() {
	return array(
		''            => __( 'Geen', 'szm-hover-animations' ),
		'accordion'   => __( 'Accordion', 'szm-hover-animations' ),
		'horizontal'  => __( 'Horizontal scroll', 'szm-hover-animations' ),
		'fullpage'    => __( 'Full-viewport scroll slides', 'szm-hover-animations' ),
		'process'     => __( 'Sticky proces-stappen', 'szm-hover-animations' ),
	);
}

/**
 * Curated easing-presets — geen losse GSAP/CSS-easingstring-invoer (te
 * technisch), maar een paar smaken die overal (CSS-transities én GSAP-tweens)
 * naar een concrete curve vertalen. Zie EASE_CSS_MAP/EASE_GSAP_MAP in
 * editor.js/gsap-effects.js voor de daadwerkelijke waarden per preset.
 */
function szm_ha_get_easing_presets() {
	return array(
		'smooth' => __( 'Vloeiend', 'szm-hover-animations' ),
		'snappy' => __( 'Strak', 'szm-hover-animations' ),
		'bouncy' => __( 'Elastisch', 'szm-hover-animations' ),
		'linear' => __( 'Lineair (constante snelheid)', 'szm-hover-animations' ),
	);
}

/**
 * Wanneer een gepind scroll-effect (sticky proces-stappen, horizontal scroll,
 * video-scrub) begint met pinnen, relatief tot het blok. Los van deze keuze
 * corrigeert gsap-effects.js altijd automatisch voor een sticky header/
 * WP-adminbalk bovenaan de pagina (zie getFixedHeaderOffset()) — dat is geen
 * gebruikersinstelling, dat hoort altijd te kloppen.
 */
function szm_ha_get_pin_start_presets() {
	return array(
		'top'    => __( 'Direct bovenaan beeld', 'szm-hover-animations' ),
		'half'   => __( 'Op een kwart van het scherm', 'szm-hover-animations' ),
		'center' => __( 'Gecentreerd in beeld', 'szm-hover-animations' ),
	);
}

/**
 * Wachttijd voordat tekst-reveal/counter zichzelf herhaalt (verdwijnen +
 * opnieuw afspelen), zolang het blok in beeld blijft. Preset i.p.v. een
 * los seconden-veld, zelfde UX-patroon als easing/pin-start hierboven.
 */
function szm_ha_get_loop_delay_presets() {
	return array(
		'short'  => __( 'Kort (~15 sec)', 'szm-hover-animations' ),
		'normal' => __( 'Normaal (~30 sec)', 'szm-hover-animations' ),
		'long'   => __( 'Lang (~60 sec)', 'szm-hover-animations' ),
	);
}

/**
 * Overgangsstijl tussen panelen bij Full-viewport scroll slides.
 */
function szm_ha_get_fullpage_transition_presets() {
	return array(
		'fade'    => __( 'Uitfaden', 'szm-hover-animations' ),
		'stack'   => __( 'Stapelen', 'szm-hover-animations' ),
		'slideup' => __( 'Omhoog schuiven', 'szm-hover-animations' ),
		'zoom'    => __( 'Uitzoomen', 'szm-hover-animations' ),
	);
}

/**
 * Weergave-modus voor Horizontal scroll: klassiek zijwaarts meescrollen, of
 * panelen die als kaarten op elkaar stapelen (geen horizontale beweging).
 */
function szm_ha_get_horizontal_mode_presets() {
	return array(
		'scroll' => __( 'Zijwaarts scrollen', 'szm-hover-animations' ),
		'stack'  => __( 'Stapelen', 'szm-hover-animations' ),
	);
}

/**
 * Sleutels van de preview-GIF's in assets/previews/ (bestandsnaam zonder .gif,
 * bv. 'hover-lift'). De editor toont er één onder de gekozen effect-optie.
 */
function szm_ha_get_preview_keys() {
	$files = glob( SZM_HA_DIR . 'assets/previews/*.gif' );
	return array_map(
		function ( $file ) {
			return basename( $file, '.gif' );
		},
		$files ? $files : array()
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
			'entranceBlocks'  => apply_filters( 'szm_ha_supported_entrance_blocks', array(
				'core/group', 'core/cover', 'core/column', 'core/columns',
				'core/heading', 'core/paragraph', 'core/list', 'core/quote', 'core/pullquote',
				'core/image', 'core/gallery', 'core/video', 'core/embed', 'core/media-text',
				'core/buttons', 'core/button', 'core/table', 'core/details', 'core/separator',
				'core/social-links',
			) ),
			// GSAP-module: geen nieuwe blokken, gedrag toegevoegd aan bestaande blokken.
			'gsapVideoOptions' => szm_ha_get_gsap_video_effects(),
			// Welk blok slider-gedrag krijgt (kolommen worden slides).
			'gsapSliderBlocks' => apply_filters( 'szm_ha_gsap_slider_blocks', array( 'core/columns' ) ),
			// Sticky process-stappen: eerste kolom blijft (gepind) staan, de directe
			// kind-blokken van de tweede kolom klappen één voor één in tijdens
			// scrollen. Zelfde patroon als de handgeschreven GSAP-scrollytelling-
			// sectie op studiozondermeer.nl zelf, nu als generieke Inspector-toggle.
			// Sluit uit met de slider hierboven op hetzelfde blok — bij beide aan
			// wint de slider (zie withAnimationControls/addSaveProps in editor.js).
			'gsapProcessBlocks' => apply_filters( 'szm_ha_gsap_process_blocks', array( 'core/columns' ) ),
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
			// Eén-dropdown GSAP-effect-keuze per blok-familie (i.p.v. losse
			// aan/uit-toggles per effect, zie SPEC "1 box in de site editor").
			'gsapColumnsOptions' => szm_ha_get_gsap_columns_effects(),
			'gsapGroupOptions'   => szm_ha_get_gsap_group_effects(),
			'easingOptions'      => szm_ha_get_easing_presets(),
			'pinStartOptions'    => szm_ha_get_pin_start_presets(),
			'loopDelayOptions'   => szm_ha_get_loop_delay_presets(),
			'fullpageTransitionOptions' => szm_ha_get_fullpage_transition_presets(),
			'horizontalModeOptions'     => szm_ha_get_horizontal_mode_presets(),
			// Preview-GIF's onder de effect-keuzes: welke bestaan (sleutel = bestandsnaam).
			'previews'   => szm_ha_get_preview_keys(),
			'previewUrl' => SZM_HA_URL . 'assets/previews/',
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
