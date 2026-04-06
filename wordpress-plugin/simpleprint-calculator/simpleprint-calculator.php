<?php
/**
 * Plugin Name: SimplePrint Calculator
 * Description: Embeds the SimplePrint pricing calculator widget via shortcode and provides an admin UI to manage which API products get a WordPress page.
 * Version: 1.2.0
 * Author: CR8tive Print Logic
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Default API host — change in Settings > SimplePrint
define( 'SIMPLEPRINT_DEFAULT_API', 'https://simpleprint.fly.dev' );

// Load WooCommerce integration if WC is active.
add_action( 'plugins_loaded', function() {
    if ( class_exists( 'WooCommerce' ) ) {
        require_once __DIR__ . '/includes/woocommerce-integration.php';
    }
}, 20 );

// Meta key that links a WP page to a SimplePrint product id
define( 'SIMPLEPRINT_PRODUCT_META_KEY', '_simpleprint_product_id' );

/* -------------------------------------------------------------------------
 * API helpers
 * ------------------------------------------------------------------------- */

function simpleprint_get_api_url() {
    return rtrim( get_option( 'simpleprint_api_url', SIMPLEPRINT_DEFAULT_API ), '/' );
}

/**
 * Fetch products from the SimplePrint API.
 * @return array|WP_Error
 */
function simpleprint_fetch_products() {
    $url      = simpleprint_get_api_url() . '/api/v1/products';
    $response = wp_remote_get( $url, array( 'timeout' => 15 ) );

    if ( is_wp_error( $response ) ) {
        return $response;
    }
    $code = wp_remote_retrieve_response_code( $response );
    if ( $code !== 200 ) {
        return new WP_Error( 'simpleprint_api_error', "API returned HTTP $code" );
    }
    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    if ( ! is_array( $body ) ) {
        return new WP_Error( 'simpleprint_api_error', 'Unexpected API response shape' );
    }
    // API may return either {products: [...]} or {data: [...]}
    if ( isset( $body['products'] ) && is_array( $body['products'] ) ) {
        return $body['products'];
    }
    if ( isset( $body['data'] ) && is_array( $body['data'] ) ) {
        return $body['data'];
    }
    return new WP_Error( 'simpleprint_api_error', 'Unexpected API response shape' );
}

/**
 * Find the WP page (if any) linked to a given product id.
 * @return WP_Post|null
 */
function simpleprint_find_product_page( $product_id ) {
    $posts = get_posts( array(
        'post_type'      => 'page',
        'post_status'    => array( 'publish', 'draft', 'private', 'pending' ),
        'meta_key'       => SIMPLEPRINT_PRODUCT_META_KEY,
        'meta_value'     => (string) $product_id,
        'posts_per_page' => 1,
    ) );
    return $posts ? $posts[0] : null;
}

/**
 * Create a WP page for a given product.
 * @return int|WP_Error new page ID
 */
function simpleprint_create_product_page( $product ) {
    $product_id   = (string) $product['id'];
    $product_name = (string) $product['name'];

    $content  = "<h2>" . esc_html( $product_name ) . "</h2>\n";
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
        return $page_id;
    }
    update_post_meta( $page_id, SIMPLEPRINT_PRODUCT_META_KEY, $product_id );
    return $page_id;
}

/* -------------------------------------------------------------------------
 * Activation
 * ------------------------------------------------------------------------- */

/**
 * On activation: only create the main /calculator picker page if missing.
 * Per-product pages are managed manually in "SimplePrint Products".
 */
function simpleprint_activate() {
    if ( ! get_page_by_path( 'calculator' ) ) {
        wp_insert_post( array(
            'post_title'   => 'Calculator',
            'post_name'    => 'calculator',
            'post_content' => "<h2>Get a Quote</h2>\n<p>Select your options below to calculate your print job price.</p>\n\n[simpleprint_calculator]",
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => get_current_user_id() ?: 1,
        ) );
    }
}
register_activation_hook( __FILE__, 'simpleprint_activate' );

/* -------------------------------------------------------------------------
 * Shortcode + widget
 * ------------------------------------------------------------------------- */

function simpleprint_enqueue_widget() {
    wp_enqueue_script(
        'simpleprint-widget',
        simpleprint_get_api_url() . '/widget.js',
        array(),
        '1.3.0',
        true
    );
    wp_enqueue_style(
        'simpleprint-widget-css',
        plugin_dir_url( __FILE__ ) . 'assets/widget.css',
        array(),
        '1.3.0'
    );
    // Inject custom CSS from settings (if any)
    $custom_css = trim( (string) get_option( 'simpleprint_custom_css', '' ) );
    if ( $custom_css !== '' ) {
        wp_add_inline_style( 'simpleprint-widget-css', $custom_css );
    }
}

function simpleprint_calculator_shortcode( $atts ) {
    $atts = shortcode_atts( array( 'product_id' => '' ), $atts, 'simpleprint_calculator' );
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

/* -------------------------------------------------------------------------
 * Admin menu
 * ------------------------------------------------------------------------- */

function simpleprint_admin_menu() {
    // Top-level menu
    add_menu_page(
        'SimplePrint Products',
        'SimplePrint',
        'manage_options',
        'simpleprint-products',
        'simpleprint_products_page',
        'dashicons-products',
        30
    );
    add_submenu_page(
        'simpleprint-products',
        'Products',
        'Products',
        'manage_options',
        'simpleprint-products',
        'simpleprint_products_page'
    );
    add_submenu_page(
        'simpleprint-products',
        'Settings',
        'Settings',
        'manage_options',
        'simpleprint-settings',
        'simpleprint_settings_page'
    );
}
add_action( 'admin_menu', 'simpleprint_admin_menu' );

function simpleprint_register_settings() {
    register_setting( 'simpleprint_settings', 'simpleprint_api_url' );
    register_setting( 'simpleprint_settings', 'simpleprint_custom_css' );
}
add_action( 'admin_init', 'simpleprint_register_settings' );

/* -------------------------------------------------------------------------
 * Per-product actions (admin-post endpoints)
 * ------------------------------------------------------------------------- */

function simpleprint_assert_admin() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized' );
    }
}

function simpleprint_redirect_back( $notice = '' ) {
    $url = admin_url( 'admin.php?page=simpleprint-products' );
    if ( $notice ) {
        $url = add_query_arg( 'simpleprint_notice', rawurlencode( $notice ), $url );
    }
    wp_safe_redirect( $url );
    exit;
}

/** Create page for a single product. */
function simpleprint_action_create_page() {
    simpleprint_assert_admin();
    check_admin_referer( 'simpleprint_product_action' );

    $product_id = isset( $_POST['product_id'] ) ? sanitize_text_field( wp_unslash( $_POST['product_id'] ) ) : '';
    if ( ! $product_id ) {
        simpleprint_redirect_back( 'Missing product id.' );
    }

    $products = simpleprint_fetch_products();
    if ( is_wp_error( $products ) ) {
        simpleprint_redirect_back( 'API error: ' . $products->get_error_message() );
    }

    $product = null;
    foreach ( $products as $p ) {
        if ( (string) $p['id'] === $product_id ) {
            $product = $p;
            break;
        }
    }
    if ( ! $product ) {
        simpleprint_redirect_back( 'Product not found in API.' );
    }

    if ( simpleprint_find_product_page( $product_id ) ) {
        simpleprint_redirect_back( 'Page already exists for this product.' );
    }

    $result = simpleprint_create_product_page( $product );
    if ( is_wp_error( $result ) ) {
        simpleprint_redirect_back( 'Failed to create page: ' . $result->get_error_message() );
    }
    simpleprint_redirect_back( "Page created for: {$product['name']}" );
}
add_action( 'admin_post_simpleprint_create_page', 'simpleprint_action_create_page' );

/** Toggle show/hide (publish ↔ draft). */
function simpleprint_action_toggle_visibility() {
    simpleprint_assert_admin();
    check_admin_referer( 'simpleprint_product_action' );

    $product_id = isset( $_POST['product_id'] ) ? sanitize_text_field( wp_unslash( $_POST['product_id'] ) ) : '';
    $page = simpleprint_find_product_page( $product_id );
    if ( ! $page ) {
        simpleprint_redirect_back( 'No page exists for this product.' );
    }

    $new_status = ( $page->post_status === 'publish' ) ? 'draft' : 'publish';
    wp_update_post( array(
        'ID'          => $page->ID,
        'post_status' => $new_status,
    ) );
    simpleprint_redirect_back( $new_status === 'publish' ? "Showing: {$page->post_title}" : "Hidden: {$page->post_title}" );
}
add_action( 'admin_post_simpleprint_toggle_visibility', 'simpleprint_action_toggle_visibility' );

/** Update title from API (in case product was renamed). */
function simpleprint_action_update_title() {
    simpleprint_assert_admin();
    check_admin_referer( 'simpleprint_product_action' );

    $product_id = isset( $_POST['product_id'] ) ? sanitize_text_field( wp_unslash( $_POST['product_id'] ) ) : '';
    $page = simpleprint_find_product_page( $product_id );
    if ( ! $page ) {
        simpleprint_redirect_back( 'No page exists for this product.' );
    }

    $products = simpleprint_fetch_products();
    if ( is_wp_error( $products ) ) {
        simpleprint_redirect_back( 'API error: ' . $products->get_error_message() );
    }
    foreach ( $products as $p ) {
        if ( (string) $p['id'] === $product_id ) {
            wp_update_post( array(
                'ID'         => $page->ID,
                'post_title' => $p['name'],
            ) );
            simpleprint_redirect_back( "Title updated: {$p['name']}" );
        }
    }
    simpleprint_redirect_back( 'Product not found in API.' );
}
add_action( 'admin_post_simpleprint_update_title', 'simpleprint_action_update_title' );

/* -------------------------------------------------------------------------
 * Admin pages
 * ------------------------------------------------------------------------- */

function simpleprint_products_page() {
    $products = simpleprint_fetch_products();
    $notice   = isset( $_GET['simpleprint_notice'] ) ? sanitize_text_field( wp_unslash( $_GET['simpleprint_notice'] ) ) : '';
    ?>
    <div class="wrap">
        <h1>SimplePrint Products</h1>
        <p>Manage which API products have a WordPress page. Pages are <strong>not deleted</strong> when hidden — they are moved to draft.</p>

        <?php if ( $notice ) : ?>
            <div class="notice notice-info is-dismissible"><p><?php echo esc_html( $notice ); ?></p></div>
        <?php endif; ?>

        <?php if ( is_wp_error( $products ) ) : ?>
            <div class="notice notice-error"><p><strong>API error:</strong> <?php echo esc_html( $products->get_error_message() ); ?></p></div>
            <p>Check the API URL in <a href="<?php echo esc_url( admin_url( 'admin.php?page=simpleprint-settings' ) ); ?>">Settings</a>.</p>
            <?php return; ?>
        <?php endif; ?>

        <p><strong><?php echo count( $products ); ?></strong> products found in API.</p>

        <?php $wc_active = class_exists( 'WooCommerce' ); ?>

        <table class="wp-list-table widefat striped" style="table-layout:auto;">
            <thead>
                <tr>
                    <th style="width:60px;">ID</th>
                    <th style="min-width:240px;">Product Name</th>
                    <th style="width:130px;">Page Status</th>
                    <?php if ( $wc_active ) : ?><th style="width:140px;">WC Product</th><?php endif; ?>
                    <th style="width:340px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ( $products as $product ) :
                    $pid    = (string) $product['id'];
                    $page   = simpleprint_find_product_page( $pid );
                    $status = $page ? $page->post_status : 'none';
                ?>
                    <tr>
                        <td><?php echo esc_html( $pid ); ?></td>
                        <td><strong><?php echo esc_html( $product['name'] ); ?></strong>
                            <?php if ( $page ) : ?>
                                <br /><a href="<?php echo esc_url( get_permalink( $page->ID ) ); ?>" target="_blank"><?php echo esc_html( get_permalink( $page->ID ) ); ?></a>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ( $status === 'publish' ) : ?>
                                <span style="color:#46b450;">● Published</span>
                            <?php elseif ( $status === 'draft' ) : ?>
                                <span style="color:#dc3232;">● Hidden (Draft)</span>
                            <?php else : ?>
                                <span style="color:#999;">○ No page</span>
                            <?php endif; ?>
                        </td>
                        <?php if ( $wc_active ) :
                            $wc_id = function_exists( 'simpleprint_wc_find_product' ) ? simpleprint_wc_find_product( $pid ) : null;
                        ?>
                            <td>
                                <?php if ( $wc_id ) : ?>
                                    <a href="<?php echo esc_url( get_edit_post_link( $wc_id ) ); ?>" target="_blank">● Linked</a>
                                <?php else : ?>
                                    <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                        <input type="hidden" name="action" value="simpleprint_create_wc_product" />
                                        <input type="hidden" name="product_id" value="<?php echo esc_attr( $pid ); ?>" />
                                        <?php wp_nonce_field( 'simpleprint_product_action' ); ?>
                                        <button type="submit" class="button">Create WC Product</button>
                                    </form>
                                <?php endif; ?>
                            </td>
                        <?php endif; ?>
                        <td>
                            <?php if ( ! $page ) : ?>
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <input type="hidden" name="action" value="simpleprint_create_page" />
                                    <input type="hidden" name="product_id" value="<?php echo esc_attr( $pid ); ?>" />
                                    <?php wp_nonce_field( 'simpleprint_product_action' ); ?>
                                    <button type="submit" class="button button-primary">Create Page</button>
                                </form>
                            <?php else : ?>
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <input type="hidden" name="action" value="simpleprint_toggle_visibility" />
                                    <input type="hidden" name="product_id" value="<?php echo esc_attr( $pid ); ?>" />
                                    <?php wp_nonce_field( 'simpleprint_product_action' ); ?>
                                    <button type="submit" class="button">
                                        <?php echo $status === 'publish' ? 'Hide' : 'Show'; ?>
                                    </button>
                                </form>
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <input type="hidden" name="action" value="simpleprint_update_title" />
                                    <input type="hidden" name="product_id" value="<?php echo esc_attr( $pid ); ?>" />
                                    <?php wp_nonce_field( 'simpleprint_product_action' ); ?>
                                    <button type="submit" class="button">Sync Title</button>
                                </form>
                                <a href="<?php echo esc_url( get_edit_post_link( $page->ID ) ); ?>" class="button">Edit</a>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php
}

function simpleprint_settings_page() {
    ?>
    <div class="wrap">
        <h1>SimplePrint Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'simpleprint_settings' ); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="simpleprint_api_url">API URL</label></th>
                    <td>
                        <input type="url" id="simpleprint_api_url" name="simpleprint_api_url"
                            value="<?php echo esc_attr( get_option( 'simpleprint_api_url', SIMPLEPRINT_DEFAULT_API ) ); ?>"
                            class="regular-text"
                            placeholder="<?php echo esc_attr( SIMPLEPRINT_DEFAULT_API ); ?>" />
                        <p class="description">Base URL of your SimplePrint API (no trailing slash).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="simpleprint_custom_css">Custom CSS</label></th>
                    <td>
                        <textarea id="simpleprint_custom_css" name="simpleprint_custom_css"
                            rows="12" class="large-text code"
                            placeholder=".sp-widget { background: #fff; }"><?php echo esc_textarea( get_option( 'simpleprint_custom_css', '' ) ); ?></textarea>
                        <p class="description">
                            Override default widget styles. Common selectors:
                            <code>.sp-widget</code>, <code>.sp-form-group label</code>, <code>.sp-widget select</code>, <code>.sp-btn-primary</code>, <code>#sp-price-display</code>.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr />
        <h2>Shortcode Usage</h2>
        <p>Generic calculator (with product picker):</p>
        <pre><code>[simpleprint_calculator]</code></pre>
        <p>Single-product calculator:</p>
        <pre><code>[simpleprint_calculator product_id="1"]</code></pre>
        <p>Manage which products have a page in <a href="<?php echo esc_url( admin_url( 'admin.php?page=simpleprint-products' ) ); ?>">SimplePrint → Products</a>.</p>
    </div>
    <?php
}
