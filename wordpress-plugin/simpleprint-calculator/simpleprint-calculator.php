<?php
/**
 * Plugin Name: SimplePrint Calculator
 * Description: Embeds the SimplePrint pricing calculator widget via shortcode. Use [simpleprint_calculator product_id="1"] on any page or post.
 * Version: 1.0.0
 * Author: CR8tive Print Logic
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Default API host — change in Settings > SimplePrint
define( 'SIMPLEPRINT_DEFAULT_API', 'https://simpleprint.fly.dev' );

/**
 * On plugin activation: create a "Calculator" page with the shortcode
 * if one does not already exist.
 */
function simpleprint_activate() {
    $existing = get_page_by_path( 'calculator' );
    if ( $existing ) {
        return;
    }

    wp_insert_post( array(
        'post_title'   => 'Calculator',
        'post_name'    => 'calculator',
        'post_content' => "<h2>Get a Quote</h2>\n<p>Select your options below to calculate your print job price.</p>\n\n[simpleprint_calculator]",
        'post_status'  => 'publish',
        'post_type'    => 'page',
        'post_author'  => get_current_user_id() ?: 1,
    ) );
}
register_activation_hook( __FILE__, 'simpleprint_activate' );

/**
 * Get the configured API base URL.
 */
function simpleprint_get_api_url() {
    return rtrim( get_option( 'simpleprint_api_url', SIMPLEPRINT_DEFAULT_API ), '/' );
}

/**
 * Enqueue the widget script from the SimplePrint API host.
 */
function simpleprint_enqueue_widget() {
    wp_enqueue_script(
        'simpleprint-widget',
        simpleprint_get_api_url() . '/widget.js',
        array(),
        '1.0.0',
        true
    );
}

/**
 * Shortcode: [simpleprint_calculator product_id="1"]
 */
function simpleprint_calculator_shortcode( $atts ) {
    $atts = shortcode_atts(
        array(
            'product_id' => '',
        ),
        $atts,
        'simpleprint_calculator'
    );

    simpleprint_enqueue_widget();

    $container_id = 'simpleprint-calc-' . uniqid();
    $product_id   = esc_js( $atts['product_id'] );
    $product_js   = $product_id !== '' ? "'{$product_id}'" : 'null';

    ob_start();
    ?>
    <div id="<?php echo esc_attr( $container_id ); ?>" class="simpleprint-calculator-container"></div>
    <script>
    (function() {
        function initWidget() {
            if (typeof SimplePrintWidget === 'undefined') {
                setTimeout(initWidget, 100);
                return;
            }
            SimplePrintWidget.init({
                mountPoint: '#<?php echo esc_js( $container_id ); ?>',
                productId: <?php echo $product_js; ?>
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWidget);
        } else {
            initWidget();
        }
    })();
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'simpleprint_calculator', 'simpleprint_calculator_shortcode' );

/**
 * Admin settings page.
 */
function simpleprint_settings_menu() {
    add_options_page(
        'SimplePrint Settings',
        'SimplePrint',
        'manage_options',
        'simpleprint-settings',
        'simpleprint_settings_page'
    );
}
add_action( 'admin_menu', 'simpleprint_settings_menu' );

function simpleprint_register_settings() {
    register_setting( 'simpleprint_settings', 'simpleprint_api_url' );
}
add_action( 'admin_init', 'simpleprint_register_settings' );

function simpleprint_settings_page() {
    ?>
    <div class="wrap">
        <h1>SimplePrint Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'simpleprint_settings' ); ?>
            <?php do_settings_sections( 'simpleprint_settings' ); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="simpleprint_api_url">API URL</label></th>
                    <td>
                        <input
                            type="url"
                            id="simpleprint_api_url"
                            name="simpleprint_api_url"
                            value="<?php echo esc_attr( get_option( 'simpleprint_api_url', SIMPLEPRINT_DEFAULT_API ) ); ?>"
                            class="regular-text"
                            placeholder="<?php echo esc_attr( SIMPLEPRINT_DEFAULT_API ); ?>"
                        />
                        <p class="description">Base URL of your SimplePrint API (no trailing slash).</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr />
        <h2>Usage</h2>
        <p>Add the calculator to any page or post using a shortcode:</p>
        <pre><code>[simpleprint_calculator]</code></pre>
        <p>Or target a specific product:</p>
        <pre><code>[simpleprint_calculator product_id="1"]</code></pre>
    </div>
    <?php
}
