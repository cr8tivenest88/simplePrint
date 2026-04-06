<?php
/**
 * Plugin Name: SimplePrint Calculator
 * Description: Embeds the SimplePrint pricing calculator widget via shortcode and auto-creates a WordPress page per product from the SimplePrint API.
 * Version: 1.1.0
 * Author: CR8tive Print Logic
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Default API host — change in Settings > SimplePrint
define( 'SIMPLEPRINT_DEFAULT_API', 'https://simpleprint.fly.dev' );

// Meta key that links a WP page to a SimplePrint product id
define( 'SIMPLEPRINT_PRODUCT_META_KEY', '_simpleprint_product_id' );

/**
 * Get the configured API base URL.
 */
function simpleprint_get_api_url() {
    return rtrim( get_option( 'simpleprint_api_url', SIMPLEPRINT_DEFAULT_API ), '/' );
}

/**
 * Fetch products from the SimplePrint API.
 *
 * @return array|WP_Error Array of product arrays, or WP_Error on failure.
 */
function simpleprint_fetch_products() {
    $url = simpleprint_get_api_url() . '/api/v1/products';

    $response = wp_remote_get( $url, array( 'timeout' => 15 ) );

    if ( is_wp_error( $response ) ) {
        return $response;
    }

    $code = wp_remote_retrieve_response_code( $response );
    if ( $code !== 200 ) {
        return new WP_Error( 'simpleprint_api_error', "API returned HTTP $code" );
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    if ( ! is_array( $body ) || ! isset( $body['data'] ) || ! is_array( $body['data'] ) ) {
        return new WP_Error( 'simpleprint_api_error', 'Unexpected API response shape' );
    }

    return $body['data'];
}

/**
 * Sync products → WordPress pages.
 *
 * - For each API product: create a page if none exists, or update the existing page title.
 * - For each linked WP page whose product no longer exists in the API: set status to "draft" (hide, do not delete).
 *
 * @return array{created:int,updated:int,hidden:int,errors:array}
 */
function simpleprint_sync_products() {
    $result = array(
        'created' => 0,
        'updated' => 0,
        'hidden'  => 0,
        'errors'  => array(),
    );

    $products = simpleprint_fetch_products();
    if ( is_wp_error( $products ) ) {
        $result['errors'][] = $products->get_error_message();
        return $result;
    }

    $seen_ids = array();

    foreach ( $products as $product ) {
        if ( empty( $product['id'] ) || empty( $product['name'] ) ) {
            continue;
        }

        $product_id   = (string) $product['id'];
        $product_name = (string) $product['name'];
        $seen_ids[]   = $product_id;

        // Look up existing page by product id meta.
        $existing = get_posts( array(
            'post_type'      => 'page',
            'post_status'    => array( 'publish', 'draft', 'private', 'pending' ),
            'meta_key'       => SIMPLEPRINT_PRODUCT_META_KEY,
            'meta_value'     => $product_id,
            'posts_per_page' => 1,
            'fields'         => 'ids',
        ) );

        if ( ! empty( $existing ) ) {
            // Update title + ensure published.
            $page_id = $existing[0];
            wp_update_post( array(
                'ID'          => $page_id,
                'post_title'  => $product_name,
                'post_status' => 'publish',
            ) );
            $result['updated']++;
        } else {
            // Create new page.
            $content = "<h2>" . esc_html( $product_name ) . "</h2>\n";
            $content .= "<p>Configure your options below to get an instant quote.</p>\n\n";
            $content .= "[simpleprint_calculator product_id=\"" . esc_attr( $product_id ) . "\"]";

            $page_id = wp_insert_post( array(
                'post_title'   => $product_name,
                'post_content' => $content,
                'post_status'  => 'publish',
                'post_type'    => 'page',
                'post_author'  => get_current_user_id() ?: 1,
            ) );

            if ( is_wp_error( $page_id ) ) {
                $result['errors'][] = "Failed to create page for {$product_name}: " . $page_id->get_error_message();
                continue;
            }

            update_post_meta( $page_id, SIMPLEPRINT_PRODUCT_META_KEY, $product_id );
            $result['created']++;
        }
    }

    // Find pages linked to products that no longer exist → mark as draft (hide).
    $all_linked = get_posts( array(
        'post_type'      => 'page',
        'post_status'    => 'publish',
        'meta_key'       => SIMPLEPRINT_PRODUCT_META_KEY,
        'posts_per_page' => -1,
    ) );

    foreach ( $all_linked as $page ) {
        $linked_id = get_post_meta( $page->ID, SIMPLEPRINT_PRODUCT_META_KEY, true );
        if ( $linked_id && ! in_array( $linked_id, $seen_ids, true ) ) {
            wp_update_post( array(
                'ID'          => $page->ID,
                'post_status' => 'draft',
            ) );
            $result['hidden']++;
        }
    }

    return $result;
}

/**
 * On plugin activation: create main Calculator page + sync products.
 */
function simpleprint_activate() {
    // 1. Create the main calculator page (product picker).
    $existing = get_page_by_path( 'calculator' );
    if ( ! $existing ) {
        wp_insert_post( array(
            'post_title'   => 'Calculator',
            'post_name'    => 'calculator',
            'post_content' => "<h2>Get a Quote</h2>\n<p>Select your options below to calculate your print job price.</p>\n\n[simpleprint_calculator]",
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => get_current_user_id() ?: 1,
        ) );
    }

    // 2. Sync products → pages.
    simpleprint_sync_products();
}
register_activation_hook( __FILE__, 'simpleprint_activate' );

/**
 * Enqueue the widget script from the SimplePrint API host.
 */
function simpleprint_enqueue_widget() {
    wp_enqueue_script(
        'simpleprint-widget',
        simpleprint_get_api_url() . '/widget.js',
        array(),
        '1.1.0',
        true
    );
}

/**
 * Shortcode: [simpleprint_calculator product_id="1"]
 */
function simpleprint_calculator_shortcode( $atts ) {
    $atts = shortcode_atts(
        array( 'product_id' => '' ),
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
 * Admin settings page (Settings > SimplePrint).
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

/**
 * Handle the "Sync Products" button (admin-post).
 */
function simpleprint_handle_sync() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized' );
    }
    check_admin_referer( 'simpleprint_sync' );

    $result = simpleprint_sync_products();
    set_transient( 'simpleprint_sync_result', $result, 60 );

    wp_safe_redirect( admin_url( 'options-general.php?page=simpleprint-settings' ) );
    exit;
}
add_action( 'admin_post_simpleprint_sync', 'simpleprint_handle_sync' );

function simpleprint_settings_page() {
    $sync_result = get_transient( 'simpleprint_sync_result' );
    if ( $sync_result ) {
        delete_transient( 'simpleprint_sync_result' );
    }
    ?>
    <div class="wrap">
        <h1>SimplePrint Settings</h1>

        <?php if ( $sync_result ) : ?>
            <div class="notice notice-success is-dismissible">
                <p>
                    <strong>Sync complete:</strong>
                    <?php echo (int) $sync_result['created']; ?> created,
                    <?php echo (int) $sync_result['updated']; ?> updated,
                    <?php echo (int) $sync_result['hidden']; ?> hidden.
                </p>
                <?php if ( ! empty( $sync_result['errors'] ) ) : ?>
                    <p><strong>Errors:</strong></p>
                    <ul>
                        <?php foreach ( $sync_result['errors'] as $err ) : ?>
                            <li><?php echo esc_html( $err ); ?></li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>

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

        <h2>Sync Products</h2>
        <p>Fetch products from the SimplePrint API and create/update a WordPress page for each one. Pages for products that no longer exist will be moved to <strong>Draft</strong> (hidden, not deleted).</p>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
            <input type="hidden" name="action" value="simpleprint_sync" />
            <?php wp_nonce_field( 'simpleprint_sync' ); ?>
            <?php submit_button( 'Sync Products Now', 'primary', 'submit', false ); ?>
        </form>

        <hr />

        <h2>Shortcode Usage</h2>
        <p>Add the calculator to any page or post:</p>
        <pre><code>[simpleprint_calculator]</code></pre>
        <p>Or target a specific product:</p>
        <pre><code>[simpleprint_calculator product_id="1"]</code></pre>
    </div>
    <?php
}
