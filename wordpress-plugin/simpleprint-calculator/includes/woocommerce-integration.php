<?php
/**
 * SimplePrint <-> WooCommerce integration.
 *
 * Loaded only when WooCommerce is active.
 *
 * Flow:
 *  1. Admin creates a WC product linked to a SimplePrint product (meta: _simpleprint_product_id).
 *  2. On the WC product page, the default add-to-cart UI is hidden and the
 *     SimplePrint calculator is shown instead.
 *  3. When the calculator computes a price, JS populates a hidden form.
 *     Clicking "Add to Cart" submits that form with the full payload as JSON.
 *  4. WC cart item stores the payload + custom price.
 *  5. WC order line item stores the payload — visible in admin order details.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'SIMPLEPRINT_WC_META_KEY', '_simpleprint_product_id' );
define( 'SIMPLEPRINT_WC_PAYLOAD_KEY', '_simpleprint_payload' );

/* -------------------------------------------------------------------------
 * Find / create WC product linked to a SimplePrint product
 * ------------------------------------------------------------------------- */

function simpleprint_wc_find_product( $sp_product_id ) {
    $posts = get_posts( array(
        'post_type'      => 'product',
        'post_status'    => array( 'publish', 'draft', 'private', 'pending' ),
        'meta_key'       => SIMPLEPRINT_WC_META_KEY,
        'meta_value'     => (string) $sp_product_id,
        'posts_per_page' => 1,
        'fields'         => 'ids',
    ) );
    return $posts ? $posts[0] : null;
}

function simpleprint_wc_create_product( $sp_product ) {
    $sp_id   = (string) $sp_product['id'];
    $sp_name = (string) $sp_product['name'];
    $sp_desc = isset( $sp_product['description'] ) ? (string) $sp_product['description'] : '';

    $product = new WC_Product_Simple();
    $product->set_name( $sp_name );
    $product->set_description( $sp_desc );
    $product->set_status( 'publish' );
    $product->set_catalog_visibility( 'visible' );
    $product->set_price( 0 );
    $product->set_regular_price( 0 );
    $product->set_sold_individually( false );
    $product->set_virtual( false );
    $id = $product->save();

    if ( $id ) {
        update_post_meta( $id, SIMPLEPRINT_WC_META_KEY, $sp_id );
    }
    return $id;
}

/* -------------------------------------------------------------------------
 * Admin action: create WC product for a SimplePrint product
 * ------------------------------------------------------------------------- */

function simpleprint_action_create_wc_product() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized' );
    }
    check_admin_referer( 'simpleprint_product_action' );

    $sp_id = isset( $_POST['product_id'] ) ? sanitize_text_field( wp_unslash( $_POST['product_id'] ) ) : '';
    if ( ! $sp_id ) {
        simpleprint_redirect_back( 'Missing product id.' );
    }

    if ( simpleprint_wc_find_product( $sp_id ) ) {
        simpleprint_redirect_back( 'WC product already exists for this SimplePrint product.' );
    }

    $products = simpleprint_fetch_products();
    if ( is_wp_error( $products ) ) {
        simpleprint_redirect_back( 'API error: ' . $products->get_error_message() );
    }

    foreach ( $products as $p ) {
        if ( (string) $p['id'] === $sp_id ) {
            $id = simpleprint_wc_create_product( $p );
            simpleprint_redirect_back( $id ? "WC product created: {$p['name']}" : 'Failed to create WC product.' );
        }
    }
    simpleprint_redirect_back( 'Product not found in API.' );
}
add_action( 'admin_post_simpleprint_create_wc_product', 'simpleprint_action_create_wc_product' );

/* -------------------------------------------------------------------------
 * Replace add-to-cart UI on linked WC product pages with SimplePrint calculator
 * ------------------------------------------------------------------------- */

function simpleprint_wc_is_linked_product( $product = null ) {
    if ( ! $product ) {
        global $product;
    }
    if ( ! $product instanceof WC_Product ) {
        return false;
    }
    return (bool) get_post_meta( $product->get_id(), SIMPLEPRINT_WC_META_KEY, true );
}

/**
 * On linked product pages: remove default add-to-cart and inject the calculator.
 */
function simpleprint_wc_replace_add_to_cart() {
    global $product;
    if ( ! simpleprint_wc_is_linked_product( $product ) ) {
        return;
    }

    $sp_id = get_post_meta( $product->get_id(), SIMPLEPRINT_WC_META_KEY, true );

    // Hide WC's default add-to-cart form and price.
    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30 );
    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_price', 10 );

    // Render calculator + custom add-to-cart form.
    add_action( 'woocommerce_single_product_summary', function() use ( $sp_id, $product ) {
        echo do_shortcode( '[simpleprint_calculator product_id="' . esc_attr( $sp_id ) . '"]' );
        ?>
        <form method="post" class="simpleprint-wc-addcart" enctype="multipart/form-data">
            <input type="hidden" name="add-to-cart" value="<?php echo esc_attr( $product->get_id() ); ?>" />
            <input type="hidden" name="simpleprint_payload" id="simpleprint_payload_input" value="" />
            <button type="submit"
                    class="single_add_to_cart_button button alt simpleprint-add-cart-btn"
                    disabled
                    style="margin-top:16px;">
                Calculate price first
            </button>
        </form>
        <script>
        (function() {
            // Wire the calculator's payload to our hidden form.
            function wirePayload() {
                if ( typeof window.SimplePrintWidget === 'undefined' ) {
                    setTimeout( wirePayload, 200 );
                    return;
                }
                // Poll for the calculator's current payload via the visible price area
                // (the widget exposes window.__sp_currentPayload if present, otherwise we hook DOM).
                var input = document.getElementById( 'simpleprint_payload_input' );
                var btn   = document.querySelector( '.simpleprint-add-cart-btn' );
                if ( ! input || ! btn ) return;

                // Listen for changes on any sp- form field — re-check payload after a short delay.
                document.addEventListener( 'change', function( e ) {
                    if ( ! e.target || ! e.target.id || e.target.id.indexOf( 'sp-' ) !== 0 ) return;
                    setTimeout( syncPayload, 400 );
                } );

                function syncPayload() {
                    var payload = window.__sp_currentPayload || null;
                    if ( payload && payload.totals ) {
                        input.value = JSON.stringify( payload );
                        btn.disabled = false;
                        btn.textContent = 'Add to Cart — $' + Number( payload.totals.grandTotal ).toFixed( 2 );
                    }
                }
                setInterval( syncPayload, 1000 );
            }
            wirePayload();
        })();
        </script>
        <?php
    }, 30 );
}
add_action( 'woocommerce_before_single_product', 'simpleprint_wc_replace_add_to_cart' );

/* -------------------------------------------------------------------------
 * Capture payload on add-to-cart and save to cart item
 * ------------------------------------------------------------------------- */

function simpleprint_wc_add_cart_item_data( $cart_item_data, $product_id ) {
    if ( ! isset( $_POST['simpleprint_payload'] ) ) {
        return $cart_item_data;
    }
    $raw     = wp_unslash( $_POST['simpleprint_payload'] );
    $payload = json_decode( $raw, true );
    if ( ! is_array( $payload ) || empty( $payload['totals']['grandTotal'] ) ) {
        return $cart_item_data;
    }

    $cart_item_data[ SIMPLEPRINT_WC_PAYLOAD_KEY ] = $payload;
    // Force cart item to be unique even if same product is added with diff specs.
    $cart_item_data['unique_key'] = md5( $raw . microtime() );
    return $cart_item_data;
}
add_filter( 'woocommerce_add_cart_item_data', 'simpleprint_wc_add_cart_item_data', 10, 2 );

/**
 * Set the cart item price from the payload.
 */
function simpleprint_wc_set_cart_item_price( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
        return;
    }
    foreach ( $cart->get_cart() as $cart_item ) {
        if ( ! empty( $cart_item[ SIMPLEPRINT_WC_PAYLOAD_KEY ]['totals']['grandTotal'] ) ) {
            $price = (float) $cart_item[ SIMPLEPRINT_WC_PAYLOAD_KEY ]['totals']['grandTotal'];
            $cart_item['data']->set_price( $price );
        }
    }
}
add_action( 'woocommerce_before_calculate_totals', 'simpleprint_wc_set_cart_item_price', 20 );

/**
 * Show the spec summary in the cart and checkout.
 */
function simpleprint_wc_cart_item_data_display( $item_data, $cart_item ) {
    if ( empty( $cart_item[ SIMPLEPRINT_WC_PAYLOAD_KEY ] ) ) {
        return $item_data;
    }
    $payload = $cart_item[ SIMPLEPRINT_WC_PAYLOAD_KEY ];
    $inputs  = isset( $payload['inputs'] ) ? $payload['inputs'] : array();

    if ( ! empty( $inputs['paperName'] ) ) {
        $item_data[] = array( 'name' => 'Paper', 'value' => $inputs['paperName'] );
    }
    if ( ! empty( $inputs['quantity'] ) ) {
        $item_data[] = array( 'name' => 'Quantity', 'value' => $inputs['quantity'] );
    }
    if ( ! empty( $inputs['size'] ) ) {
        $item_data[] = array( 'name' => 'Size', 'value' => $inputs['size'] );
    }
    if ( ! empty( $inputs['upgrades'] ) && is_array( $inputs['upgrades'] ) ) {
        $item_data[] = array( 'name' => 'Upgrades', 'value' => implode( ', ', $inputs['upgrades'] ) );
    }
    return $item_data;
}
add_filter( 'woocommerce_get_item_data', 'simpleprint_wc_cart_item_data_display', 10, 2 );

/**
 * Save payload to the order line item on checkout.
 */
function simpleprint_wc_save_order_line_item( $item, $cart_item_key, $values, $order ) {
    if ( empty( $values[ SIMPLEPRINT_WC_PAYLOAD_KEY ] ) ) {
        return;
    }
    $payload = $values[ SIMPLEPRINT_WC_PAYLOAD_KEY ];
    $item->add_meta_data( '_simpleprint_payload', wp_json_encode( $payload ), true );

    // Human-readable specs as visible meta.
    $inputs = isset( $payload['inputs'] ) ? $payload['inputs'] : array();
    if ( ! empty( $inputs['paperName'] ) ) $item->add_meta_data( 'Paper', $inputs['paperName'], true );
    if ( ! empty( $inputs['quantity'] ) )  $item->add_meta_data( 'Quantity', $inputs['quantity'], true );
    if ( ! empty( $inputs['size'] ) )      $item->add_meta_data( 'Size', $inputs['size'], true );
    if ( ! empty( $inputs['upgrades'] ) && is_array( $inputs['upgrades'] ) ) {
        $item->add_meta_data( 'Upgrades', implode( ', ', $inputs['upgrades'] ), true );
    }
}
add_action( 'woocommerce_checkout_create_order_line_item', 'simpleprint_wc_save_order_line_item', 10, 4 );

/**
 * Show the full payload breakdown in the admin order details.
 */
function simpleprint_wc_admin_order_item_meta( $item_id, $item, $product ) {
    $payload_json = $item->get_meta( '_simpleprint_payload', true );
    if ( ! $payload_json ) {
        return;
    }
    $payload = json_decode( $payload_json, true );
    if ( ! is_array( $payload ) ) {
        return;
    }
    ?>
    <div class="simpleprint-order-payload" style="margin-top:8px; padding:8px; background:#f9fafb; border-left:3px solid #2563eb; font-size:12px;">
        <strong>SimplePrint breakdown:</strong>
        <?php if ( ! empty( $payload['lineItems'] ) ) : ?>
            <ul style="margin:4px 0 0 16px;">
                <?php foreach ( $payload['lineItems'] as $li ) : ?>
                    <li><?php echo esc_html( $li['description'] ); ?> — $<?php echo number_format( (float) $li['total'], 2 ); ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
        <?php if ( ! empty( $payload['totals'] ) ) : ?>
            <div style="margin-top:4px;">
                Subtotal: $<?php echo number_format( (float) ( $payload['totals']['subtotal'] ?? 0 ), 2 ); ?> ·
                Total: <strong>$<?php echo number_format( (float) ( $payload['totals']['grandTotal'] ?? 0 ), 2 ); ?></strong>
            </div>
        <?php endif; ?>
    </div>
    <?php
}
add_action( 'woocommerce_after_order_itemmeta', 'simpleprint_wc_admin_order_item_meta', 10, 3 );
