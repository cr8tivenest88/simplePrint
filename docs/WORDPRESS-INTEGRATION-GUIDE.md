# SimplePrint Calculator - WordPress Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Basic Workflow](#basic-workflow)
4. [WordPress Plugin Structure](#wordpress-plugin-structure)
5. [Installation Methods](#installation-methods)
6. [Implementation Examples](#implementation-examples)
7. [Database Schema](#database-schema)
8. [API Integration](#api-integration)
9. [Shortcode Usage](#shortcode-usage)
10. [Customization](#customization)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The SimplePrint Calculator WordPress integration allows you to embed a fully functional print pricing calculator into any WordPress site. The system consists of:

- **SimplePrint API Server**: Hosts the calculator widget and provides pricing APIs
- **WordPress Plugin**: Handles integration, database storage, and user management
- **JavaScript Widget**: Self-contained UI that renders the calculator interface

### Key Features

- Real-time price calculations
- Product configuration (paper types, quantities, upgrades)
- Quote saving and management
- User authentication integration
- Admin dashboard for quote management
- Shortcode-based embedding
- REST API for custom integrations
- Caching for performance optimization

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WordPress Site                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              WordPress Page/Post                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [simpleprint_calculator]  Shortcode          │  │  │
│  │  │  ↓                                              │  │  │
│  │  │  <div id="calculator-widget"></div>            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SimplePrint WordPress Plugin                  │  │
│  │  - Loads widget.js from SimplePrint server           │  │
│  │  - Provides REST API endpoints                       │  │
│  │  - Manages database storage                          │  │
│  │  - Handles user authentication                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WordPress Database                            │  │
│  │  - wp_simpleprint_quotes                             │  │
│  │  - wp_simpleprint_quote_items                        │  │
│  │  - wp_simpleprint_api_cache                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↑ ↓
                    (API Calls & Widget)
                           ↑ ↓
┌─────────────────────────────────────────────────────────────┐
│              SimplePrint API Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /widget.js  - JavaScript widget file                │  │
│  │  /api/v1/products  - Get all products                │  │
│  │  /api/v1/products/:id  - Get product details         │  │
│  │  /api/v1/calculate  - Calculate pricing              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Basic Workflow

### User Flow

```
1. User visits WordPress page with calculator
   ↓
2. WordPress plugin loads widget.js from SimplePrint server
   ↓
3. Widget fetches available products from SimplePrint API
   ↓
4. User selects product, paper type, quantity, and upgrades
   ↓
5. Widget automatically calculates price in real-time
   ↓
6. User clicks "Save Quote"
   ↓
7. Quote data sent to WordPress REST API endpoint
   ↓
8. WordPress plugin saves quote to database
   ↓
9. User receives confirmation and quote ID
   ↓
10. User can view saved quotes in "My Quotes" page
```

### Admin Flow

```
1. Admin logs into WordPress admin panel
   ↓
2. Navigates to SimplePrint > Settings
   ↓
3. Configures calculator host URL and API key
   ↓
4. Admin can view all quotes in SimplePrint > Quotes
   ↓
5. Admin can export, filter, and manage quotes
   ↓
6. Admin can change quote status (pending/approved/completed)
```

---

## WordPress Plugin Structure

### Recommended Directory Structure

```
wp-content/plugins/simpleprint-calculator/
│
├── simpleprint-calculator.php          # Main plugin file
├── uninstall.php                        # Cleanup on uninstall
├── README.md                            # Plugin documentation
├── LICENSE.txt                          # License information
│
├── admin/                               # Admin-specific functionality
│   ├── class-simpleprint-calculator-admin.php
│   ├── partials/
│   │   ├── admin-settings.php          # Settings page template
│   │   ├── admin-quotes-list.php       # Quotes list page
│   │   └── admin-quote-details.php     # Quote details page
│   ├── css/
│   │   └── admin.css                   # Admin styles
│   └── js/
│       └── admin.js                    # Admin scripts
│
├── public/                              # Public-facing functionality
│   ├── class-simpleprint-calculator-public.php
│   ├── partials/
│   │   ├── calculator-widget.php       # Widget container template
│   │   └── my-quotes.php               # User quotes page
│   ├── css/
│   │   └── public.css                  # Public styles
│   └── js/
│       └── public.js                   # Public scripts
│
├── includes/                            # Core plugin classes
│   ├── class-simpleprint-calculator.php              # Main class
│   ├── class-simpleprint-calculator-loader.php       # Hook loader
│   ├── class-simpleprint-calculator-activator.php    # Activation
│   ├── class-simpleprint-calculator-deactivator.php  # Deactivation
│   ├── class-simpleprint-calculator-database.php     # DB operations
│   └── class-simpleprint-calculator-api.php          # API client
│
├── assets/                              # Static assets
│   ├── images/
│   │   └── icon.png                    # Plugin icon
│   └── screenshots/
│       └── screenshot-1.png            # Plugin screenshots
│
└── templates/                           # Template files
    ├── calculator-fullwidth.php        # Full-width template
    ├── calculator-sidebar.php          # Sidebar template
    └── calculator-popup.php            # Popup/modal template
```

---

## Installation Methods

### Method 1: Basic Script Integration (No Plugin)

The simplest way to integrate the calculator without a full plugin:

```php
<!-- Add to your WordPress theme's functions.php -->
<?php
function simpleprint_enqueue_widget() {
    if (is_page('quote')) { // Only load on quote page
        wp_enqueue_script(
            'simpleprint-widget',
            'http://localhost:3080/widget.js',
            array(),
            null,
            true
        );

        wp_add_inline_script('simpleprint-widget', "
            document.addEventListener('DOMContentLoaded', function() {
                SimplePrintWidget.init({
                    mountPoint: '#quote-calculator',
                    onPayload: function(payload) {
                        console.log('Quote calculated:', payload);
                        // Handle quote saving here
                    },
                    onError: function(error) {
                        console.error('Calculator error:', error);
                    }
                });
            });
        ");
    }
}
add_action('wp_enqueue_scripts', 'simpleprint_enqueue_widget');
?>

<!-- Add to your page template -->
<div id="quote-calculator"></div>
```

### Method 2: Custom Shortcode (Lightweight)

```php
<!-- Add to functions.php -->
<?php
function simpleprint_calculator_shortcode($atts) {
    $atts = shortcode_atts(array(
        'product_id' => null,
        'width' => '100%',
        'height' => 'auto',
    ), $atts);

    // Enqueue widget script
    wp_enqueue_script(
        'simpleprint-widget',
        'http://localhost:3080/widget.js',
        array(),
        null,
        true
    );

    $widget_id = 'sp-widget-' . uniqid();

    // Generate initialization script
    $init_script = "
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof SimplePrintWidget !== 'undefined') {
                SimplePrintWidget.init({
                    mountPoint: '#$widget_id',
                    productId: " . json_encode($atts['product_id']) . ",
                    onPayload: function(payload) {
                        // Save quote via AJAX
                        jQuery.ajax({
                            url: '" . admin_url('admin-ajax.php') . "',
                            method: 'POST',
                            data: {
                                action: 'save_simpleprint_quote',
                                nonce: '" . wp_create_nonce('save_quote') . "',
                                payload: JSON.stringify(payload)
                            },
                            success: function(response) {
                                if (response.success) {
                                    alert('Quote saved successfully! Quote ID: ' + response.data.quote_id);
                                }
                            }
                        });
                    },
                    onError: function(error) {
                        console.error('Calculator error:', error);
                    }
                });
            }
        });
    ";

    wp_add_inline_script('simpleprint-widget', $init_script);

    return '<div id="' . $widget_id . '" style="width:' . esc_attr($atts['width']) . ';height:' . esc_attr($atts['height']) . ';"></div>';
}
add_shortcode('simpleprint_calculator', 'simpleprint_calculator_shortcode');

// AJAX handler for saving quotes
function save_simpleprint_quote_ajax() {
    check_ajax_referer('save_quote', 'nonce');

    $payload = json_decode(stripslashes($_POST['payload']), true);

    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';

    $result = $wpdb->insert($table_name, array(
        'user_id' => get_current_user_id(),
        'product_id' => $payload['inputs']['productId'],
        'product_name' => $payload['inputs']['productName'],
        'quantity' => $payload['inputs']['quantity'],
        'grand_total' => $payload['totals']['grandTotal'],
        'quote_data' => json_encode($payload),
        'created_at' => current_time('mysql')
    ));

    if ($result) {
        wp_send_json_success(array('quote_id' => $wpdb->insert_id));
    } else {
        wp_send_json_error(array('message' => 'Failed to save quote'));
    }
}
add_action('wp_ajax_save_simpleprint_quote', 'save_simpleprint_quote_ajax');
add_action('wp_ajax_nopriv_save_simpleprint_quote', 'save_simpleprint_quote_ajax');
?>
```

### Method 3: Full WordPress Plugin

See the plugin structure section above for a complete plugin implementation.

---

## Implementation Examples

### Example 1: Simple Page Integration

```php
<?php
/**
 * Template Name: Quote Calculator
 */

get_header();
?>

<div class="calculator-page">
    <h1>Get Your Print Quote</h1>
    <p>Configure your print job and get an instant quote.</p>

    <?php echo do_shortcode('[simpleprint_calculator]'); ?>

    <div class="quote-info">
        <h3>Need Help?</h3>
        <p>Contact us at support@example.com or call (555) 123-4567</p>
    </div>
</div>

<?php get_footer(); ?>
```

### Example 2: Product-Specific Calculator

```php
<!-- Single Product Page Template -->
<?php
get_header();

// Get SimplePrint product ID from custom field
$simpleprint_product_id = get_post_meta(get_the_ID(), '_simpleprint_product_id', true);
?>

<div class="product-calculator">
    <h1><?php the_title(); ?></h1>

    <div class="product-description">
        <?php the_content(); ?>
    </div>

    <div class="product-pricing">
        <h2>Configure & Price</h2>
        <?php
        if ($simpleprint_product_id) {
            echo do_shortcode('[simpleprint_calculator product_id="' . $simpleprint_product_id . '"]');
        } else {
            echo '<p>Pricing calculator not available for this product.</p>';
        }
        ?>
    </div>
</div>

<?php get_footer(); ?>
```

### Example 3: User Quotes Dashboard

```php
<?php
/**
 * Template Name: My Quotes
 */

get_header();

if (!is_user_logged_in()) {
    echo '<p>Please <a href="' . wp_login_url(get_permalink()) . '">login</a> to view your quotes.</p>';
    get_footer();
    exit;
}

global $wpdb;
$table_name = $wpdb->prefix . 'simpleprint_quotes';
$user_id = get_current_user_id();

$quotes = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM $table_name WHERE user_id = %d ORDER BY created_at DESC",
    $user_id
));
?>

<div class="my-quotes-page">
    <h1>My Quotes</h1>

    <?php if (empty($quotes)): ?>
        <p>You don't have any saved quotes yet. <a href="/quote">Create your first quote</a>.</p>
    <?php else: ?>
        <table class="quotes-table">
            <thead>
                <tr>
                    <th>Quote ID</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($quotes as $quote): ?>
                <tr>
                    <td>#<?php echo $quote->id; ?></td>
                    <td><?php echo esc_html($quote->product_name); ?></td>
                    <td><?php echo number_format($quote->quantity); ?></td>
                    <td>$<?php echo number_format($quote->grand_total, 2); ?></td>
                    <td><?php echo date('M j, Y', strtotime($quote->created_at)); ?></td>
                    <td><span class="status-<?php echo $quote->status; ?>"><?php echo ucfirst($quote->status); ?></span></td>
                    <td>
                        <a href="/quote-details?id=<?php echo $quote->id; ?>">View</a>
                        <a href="/quote?duplicate=<?php echo $quote->id; ?>">Duplicate</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<?php get_footer(); ?>
```

### Example 4: Admin Quote Management

```php
<?php
/**
 * Admin page for managing quotes
 */

function simpleprint_admin_quotes_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';

    // Handle status updates
    if (isset($_POST['update_status']) && isset($_POST['quote_id'])) {
        check_admin_referer('update_quote_status');
        $wpdb->update(
            $table_name,
            array('status' => sanitize_text_field($_POST['status'])),
            array('id' => intval($_POST['quote_id']))
        );
    }

    // Get filter parameters
    $status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';

    // Build query
    $where = array('1=1');
    if ($status_filter) {
        $where[] = $wpdb->prepare("status = %s", $status_filter);
    }
    if ($search) {
        $where[] = $wpdb->prepare("(product_name LIKE %s OR id = %d)", '%' . $search . '%', intval($search));
    }

    $where_sql = implode(' AND ', $where);
    $quotes = $wpdb->get_results("SELECT * FROM $table_name WHERE $where_sql ORDER BY created_at DESC LIMIT 50");

    ?>
    <div class="wrap">
        <h1>SimplePrint Quotes</h1>

        <form method="get">
            <input type="hidden" name="page" value="simpleprint-quotes">
            <input type="text" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Search quotes...">
            <select name="status">
                <option value="">All Statuses</option>
                <option value="pending" <?php selected($status_filter, 'pending'); ?>>Pending</option>
                <option value="approved" <?php selected($status_filter, 'approved'); ?>>Approved</option>
                <option value="completed" <?php selected($status_filter, 'completed'); ?>>Completed</option>
                <option value="cancelled" <?php selected($status_filter, 'cancelled'); ?>>Cancelled</option>
            </select>
            <button type="submit" class="button">Filter</button>
        </form>

        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($quotes as $quote):
                    $user = get_userdata($quote->user_id);
                ?>
                <tr>
                    <td><?php echo $quote->id; ?></td>
                    <td><?php echo $user ? $user->display_name : 'Guest'; ?></td>
                    <td><?php echo esc_html($quote->product_name); ?></td>
                    <td><?php echo number_format($quote->quantity); ?></td>
                    <td>$<?php echo number_format($quote->grand_total, 2); ?></td>
                    <td>
                        <form method="post" style="display:inline;">
                            <?php wp_nonce_field('update_quote_status'); ?>
                            <input type="hidden" name="quote_id" value="<?php echo $quote->id; ?>">
                            <select name="status" onchange="this.form.submit()">
                                <option value="pending" <?php selected($quote->status, 'pending'); ?>>Pending</option>
                                <option value="approved" <?php selected($quote->status, 'approved'); ?>>Approved</option>
                                <option value="completed" <?php selected($quote->status, 'completed'); ?>>Completed</option>
                                <option value="cancelled" <?php selected($quote->status, 'cancelled'); ?>>Cancelled</option>
                            </select>
                            <input type="hidden" name="update_status" value="1">
                        </form>
                    </td>
                    <td><?php echo date('Y-m-d H:i', strtotime($quote->created_at)); ?></td>
                    <td>
                        <a href="?page=simpleprint-quote-details&id=<?php echo $quote->id; ?>">View</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php
}
?>
```

---

## Database Schema

### Table: wp_simpleprint_quotes

Stores the main quote information.

```sql
CREATE TABLE wp_simpleprint_quotes (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    user_id bigint(20) unsigned DEFAULT NULL,
    session_id varchar(255) DEFAULT NULL,
    product_id varchar(100) NOT NULL,
    product_name varchar(255) NOT NULL,
    quantity int(11) NOT NULL,
    paper_id varchar(100) DEFAULT NULL,
    paper_name varchar(255) DEFAULT NULL,
    size varchar(100) DEFAULT NULL,
    base_price decimal(10,2) NOT NULL DEFAULT 0.00,
    paper_upgrade decimal(10,2) NOT NULL DEFAULT 0.00,
    upgrades_cost decimal(10,2) NOT NULL DEFAULT 0.00,
    grand_total decimal(10,2) NOT NULL DEFAULT 0.00,
    unit_price decimal(10,2) NOT NULL DEFAULT 0.00,
    quote_data longtext,
    status varchar(50) DEFAULT 'pending',
    notes text,
    ip_address varchar(100) DEFAULT NULL,
    user_agent varchar(255) DEFAULT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY session_id (session_id),
    KEY product_id (product_id),
    KEY status (status),
    KEY created_at (created_at)
);
```

### Table: wp_simpleprint_quote_items

Stores individual line items for each quote.

```sql
CREATE TABLE wp_simpleprint_quote_items (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    quote_id bigint(20) unsigned NOT NULL,
    item_type varchar(50) NOT NULL,
    item_name varchar(255) NOT NULL,
    quantity int(11) NOT NULL DEFAULT 1,
    unit_price decimal(10,2) NOT NULL DEFAULT 0.00,
    total_price decimal(10,2) NOT NULL DEFAULT 0.00,
    item_data longtext,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY quote_id (quote_id),
    KEY item_type (item_type),
    FOREIGN KEY (quote_id) REFERENCES wp_simpleprint_quotes(id) ON DELETE CASCADE
);
```

### Table: wp_simpleprint_api_cache

Caches API responses for performance.

```sql
CREATE TABLE wp_simpleprint_api_cache (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    cache_key varchar(255) NOT NULL,
    cache_data longtext NOT NULL,
    expires_at datetime NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY cache_key (cache_key),
    KEY expires_at (expires_at)
);
```

---

## API Integration

### SimplePrint API Endpoints

#### 1. Get All Products

```http
GET /api/v1/products
```

**Response:**
```json
{
  "products": [
    {
      "id": "product-1",
      "name": "Business Cards",
      "isActive": true,
      "description": "Professional business cards"
    }
  ]
}
```

#### 2. Get Product Details

```http
GET /api/v1/products/:id
```

**Response:**
```json
{
  "data": {
    "id": "product-1",
    "name": "Business Cards",
    "availablePapers": [
      {
        "id": "paper-1",
        "name": "Standard Matte",
        "basePrice": 0
      }
    ],
    "quantityPrices": [
      {
        "quantity": 100,
        "price": 29.99
      }
    ],
    "upgrades": [
      {
        "name": "Rounded Corners",
        "upgradeCost": 5.00
      }
    ]
  }
}
```

#### 3. Calculate Price

```http
POST /api/v1/calculate
Content-Type: application/json

{
  "productId": "product-1",
  "paperId": "paper-1",
  "quantity": 500,
  "size": "Standard US",
  "upgradeNames": ["Rounded Corners"]
}
```

**Response:**
```json
{
  "data": {
    "inputs": {
      "productId": "product-1",
      "productName": "Business Cards",
      "quantity": 500,
      "paperId": "paper-1",
      "paperName": "Standard Matte",
      "size": "Standard US",
      "upgrades": ["Rounded Corners"]
    },
    "totals": {
      "basePrice": 89.99,
      "paperUpgrade": 0.00,
      "upgradesCost": 5.00,
      "grandTotal": 94.99,
      "unitPrice": 0.19
    },
    "lineItems": [
      {
        "type": "product",
        "name": "Business Cards",
        "quantity": 500,
        "unitPrice": 0.18,
        "totalPrice": 89.99
      },
      {
        "type": "upgrade",
        "name": "Rounded Corners",
        "quantity": 1,
        "unitPrice": 5.00,
        "totalPrice": 5.00
      }
    ]
  }
}
```

### WordPress REST API Endpoints

Register custom REST API endpoints in your plugin:

```php
<?php
// Register REST routes
add_action('rest_api_init', function() {
    // Save quote endpoint
    register_rest_route('simpleprint/v1', '/quotes', array(
        'methods' => 'POST',
        'callback' => 'simpleprint_save_quote',
        'permission_callback' => function() {
            return is_user_logged_in() || current_user_can('edit_posts');
        }
    ));

    // Get user quotes endpoint
    register_rest_route('simpleprint/v1', '/quotes', array(
        'methods' => 'GET',
        'callback' => 'simpleprint_get_quotes',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));

    // Get single quote endpoint
    register_rest_route('simpleprint/v1', '/quotes/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'simpleprint_get_quote',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));
});

function simpleprint_save_quote($request) {
    $payload = $request->get_json_params();

    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';

    $result = $wpdb->insert($table_name, array(
        'user_id' => get_current_user_id(),
        'product_id' => $payload['productId'],
        'product_name' => $payload['productName'],
        'quantity' => $payload['quantity'],
        'paper_id' => $payload['paperId'] ?? null,
        'paper_name' => $payload['paperName'] ?? '',
        'base_price' => $payload['totals']['basePrice'] ?? 0,
        'paper_upgrade' => $payload['totals']['paperUpgrade'] ?? 0,
        'upgrades_cost' => $payload['totals']['upgradesCost'] ?? 0,
        'grand_total' => $payload['totals']['grandTotal'] ?? 0,
        'unit_price' => $payload['totals']['unitPrice'] ?? 0,
        'quote_data' => json_encode($payload),
        'status' => 'pending'
    ));

    if ($result) {
        return new WP_REST_Response(array(
            'success' => true,
            'quote_id' => $wpdb->insert_id,
            'message' => 'Quote saved successfully'
        ), 200);
    } else {
        return new WP_Error('save_failed', 'Failed to save quote', array('status' => 500));
    }
}

function simpleprint_get_quotes($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';
    $user_id = get_current_user_id();

    $quotes = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE user_id = %d ORDER BY created_at DESC LIMIT 20",
        $user_id
    ));

    return new WP_REST_Response(array(
        'success' => true,
        'quotes' => $quotes
    ), 200);
}

function simpleprint_get_quote($request) {
    $quote_id = $request['id'];
    $user_id = get_current_user_id();

    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';

    $quote = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d AND user_id = %d",
        $quote_id,
        $user_id
    ));

    if ($quote) {
        return new WP_REST_Response(array(
            'success' => true,
            'quote' => $quote
        ), 200);
    } else {
        return new WP_Error('not_found', 'Quote not found', array('status' => 404));
    }
}
?>
```

---

## Shortcode Usage

### Basic Shortcode

```
[simpleprint_calculator]
```

### With Product ID

```
[simpleprint_calculator product_id="product-1"]
```

### With Custom Styling

```
[simpleprint_calculator width="800px" height="600px"]
```

### With Custom Callbacks

```php
<?php
// In your theme or plugin
add_filter('simpleprint_widget_config', function($config) {
    $config['onPayload'] = 'customSaveFunction';
    $config['onError'] = 'customErrorHandler';
    return $config;
});
?>

<script>
function customSaveFunction(payload) {
    // Custom save logic
    console.log('Custom save:', payload);

    // Send to custom endpoint
    fetch('/wp-json/custom/v1/save-quote', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => alert('Saved! ID: ' + data.id));
}

function customErrorHandler(error) {
    console.error('Custom error handler:', error);
    alert('An error occurred: ' + error.message);
}
</script>
```

### Multiple Calculators on Same Page

```
<div class="calculator-section">
    <h2>Business Cards</h2>
    [simpleprint_calculator product_id="product-1"]
</div>

<div class="calculator-section">
    <h2>Flyers</h2>
    [simpleprint_calculator product_id="product-2"]
</div>

<div class="calculator-section">
    <h2>Brochures</h2>
    [simpleprint_calculator product_id="product-3"]
</div>
```

---

## Customization

### Custom Styling

Add custom CSS to override widget styles:

```css
/* Custom styles for SimplePrint widget */
.sp-widget {
    max-width: 800px;
    margin: 0 auto;
    font-family: 'Your Custom Font', sans-serif;
}

.sp-widget .sp-form-group label {
    color: #333;
    font-weight: 600;
}

.sp-widget select,
.sp-widget input {
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 10px;
}

.sp-widget #sp-save-quote-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s;
}

.sp-widget #sp-save-quote-btn:hover {
    transform: scale(1.05);
}

.sp-widget #sp-price-display {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    padding: 20px;
}
```

### Custom JavaScript Hooks

```javascript
// Add custom behavior before initialization
document.addEventListener('DOMContentLoaded', function() {
    // Track when calculator is loaded
    if (typeof SimplePrintWidget !== 'undefined') {
        console.log('SimplePrint Widget loaded successfully');

        // Initialize with custom configuration
        const widget = SimplePrintWidget.init({
            mountPoint: '#calculator-widget',

            // Track when user changes product
            onPayload: function(payload) {
                // Send analytics event
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'quote_calculated', {
                        'event_category': 'Calculator',
                        'event_label': payload.inputs.productName,
                        'value': payload.totals.grandTotal
                    });
                }

                // Save to WordPress
                saveQuote(payload);
            },

            onError: function(error) {
                // Send error to monitoring service
                console.error('Calculator error:', error);

                // Show user-friendly message
                showNotification('error', 'Unable to calculate quote. Please try again.');
            }
        });

        // Add custom widget methods
        window.calculatorWidget = widget;
    }
});

function saveQuote(payload) {
    fetch('/wp-json/simpleprint/v1/quotes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': wpApiSettings.nonce
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('success', 'Quote #' + data.quote_id + ' saved!');

            // Redirect to quote details page
            setTimeout(() => {
                window.location.href = '/my-quotes?id=' + data.quote_id;
            }, 2000);
        }
    })
    .catch(error => {
        showNotification('error', 'Failed to save quote. Please try again.');
    });
}

function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}
```

### Custom Email Notifications

```php
<?php
// Send email notification when quote is saved
add_action('simpleprint_quote_saved', function($quote_id, $quote_data) {
    $user = get_userdata($quote_data['user_id']);

    $to = $user->user_email;
    $subject = 'Your SimplePrint Quote #' . $quote_id;

    $message = "
    <html>
    <body>
        <h2>Thank you for your quote request!</h2>
        <p>Your quote #$quote_id has been saved.</p>

        <h3>Quote Details:</h3>
        <ul>
            <li><strong>Product:</strong> {$quote_data['product_name']}</li>
            <li><strong>Quantity:</strong> {$quote_data['quantity']}</li>
            <li><strong>Total:</strong> \${$quote_data['grand_total']}</li>
        </ul>

        <p><a href='" . home_url('/my-quotes?id=' . $quote_id) . "'>View Quote Details</a></p>

        <p>If you have any questions, please contact us at support@example.com</p>
    </body>
    </html>
    ";

    $headers = array('Content-Type: text/html; charset=UTF-8');
    wp_mail($to, $subject, $message, $headers);

    // Send notification to admin
    $admin_email = get_option('admin_email');
    $admin_subject = 'New Quote Request #' . $quote_id;
    wp_mail($admin_email, $admin_subject, $message, $headers);
}, 10, 2);
?>
```

### PDF Export Integration

```php
<?php
// Add PDF export functionality
require_once 'vendor/autoload.php'; // If using TCPDF or similar

function simpleprint_export_quote_pdf($quote_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'simpleprint_quotes';

    $quote = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d",
        $quote_id
    ));

    if (!$quote) {
        return false;
    }

    $pdf = new TCPDF();
    $pdf->AddPage();

    // Header
    $pdf->SetFont('helvetica', 'B', 20);
    $pdf->Cell(0, 15, 'SimplePrint Quote #' . $quote->id, 0, 1, 'C');

    // Quote details
    $pdf->SetFont('helvetica', '', 12);
    $pdf->Ln(10);

    $html = "
    <h2>Quote Details</h2>
    <table border='1' cellpadding='5'>
        <tr><td><strong>Product:</strong></td><td>{$quote->product_name}</td></tr>
        <tr><td><strong>Quantity:</strong></td><td>{$quote->quantity}</td></tr>
        <tr><td><strong>Paper Type:</strong></td><td>{$quote->paper_name}</td></tr>
        <tr><td><strong>Base Price:</strong></td><td>\${$quote->base_price}</td></tr>
        <tr><td><strong>Upgrades:</strong></td><td>\${$quote->upgrades_cost}</td></tr>
        <tr><td><strong>Grand Total:</strong></td><td>\${$quote->grand_total}</td></tr>
    </table>
    ";

    $pdf->writeHTML($html, true, false, true, false, '');

    // Output PDF
    $pdf->Output('quote-' . $quote_id . '.pdf', 'D');
}

// Add download button to quote details page
add_action('simpleprint_quote_details_actions', function($quote_id) {
    echo '<a href="?action=export_pdf&quote_id=' . $quote_id . '" class="button">Download PDF</a>';
});

// Handle PDF export request
add_action('init', function() {
    if (isset($_GET['action']) && $_GET['action'] === 'export_pdf' && isset($_GET['quote_id'])) {
        if (is_user_logged_in()) {
            simpleprint_export_quote_pdf(intval($_GET['quote_id']));
            exit;
        }
    }
});
?>
```

---

## Security Considerations

### 1. Nonce Verification

Always verify nonces for AJAX requests:

```php
<?php
// When creating the form
wp_nonce_field('save_quote_action', 'save_quote_nonce');

// When processing
if (!isset($_POST['save_quote_nonce']) || !wp_verify_nonce($_POST['save_quote_nonce'], 'save_quote_action')) {
    wp_die('Security check failed');
}
?>
```

### 2. Input Sanitization

```php
<?php
$product_id = sanitize_text_field($_POST['product_id']);
$quantity = intval($_POST['quantity']);
$notes = sanitize_textarea_field($_POST['notes']);
$email = sanitize_email($_POST['email']);
?>
```

### 3. Capability Checks

```php
<?php
// Check if user can view quotes
if (!current_user_can('read')) {
    wp_die('You do not have permission to view quotes');
}

// Check if user can manage quotes
if (!current_user_can('manage_options')) {
    wp_die('You do not have permission to manage quotes');
}
?>
```

### 4. SQL Injection Prevention

Always use prepared statements:

```php
<?php
global $wpdb;

// WRONG - vulnerable to SQL injection
$quotes = $wpdb->get_results("SELECT * FROM quotes WHERE user_id = " . $_GET['user_id']);

// CORRECT - using prepared statement
$quotes = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM quotes WHERE user_id = %d",
    $_GET['user_id']
));
?>
```

### 5. CORS Configuration

Configure CORS properly for SimplePrint API:

```php
<?php
// In SimplePrint API server
header('Access-Control-Allow-Origin: https://yourwordpresssite.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
?>
```

### 6. API Key Authentication

```php
<?php
// Store API key securely
update_option('simpleprint_api_key', 'your-secret-api-key', false);

// Send API key with requests
function simpleprint_api_request($endpoint, $data = array()) {
    $api_key = get_option('simpleprint_api_key');
    $calculator_host = get_option('simpleprint_calculator_host');

    $response = wp_remote_post($calculator_host . $endpoint, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key' => $api_key
        ),
        'body' => json_encode($data)
    ));

    return json_decode(wp_remote_retrieve_body($response), true);
}
?>
```

### 7. Rate Limiting

```php
<?php
// Implement rate limiting for API calls
function simpleprint_check_rate_limit() {
    $user_id = get_current_user_id();
    $transient_key = 'simpleprint_rate_limit_' . $user_id;

    $requests = get_transient($transient_key);

    if ($requests === false) {
        set_transient($transient_key, 1, MINUTE_IN_SECONDS);
        return true;
    }

    if ($requests >= 60) { // Max 60 requests per minute
        return false;
    }

    set_transient($transient_key, $requests + 1, MINUTE_IN_SECONDS);
    return true;
}
?>
```

---

## Troubleshooting

### Issue 1: Widget Not Loading

**Symptoms:** Empty calculator div, no products showing

**Solutions:**

1. Check if widget.js is loading:
```javascript
// In browser console
console.log(typeof SimplePrintWidget);
// Should output "object" not "undefined"
```

2. Check CORS headers:
```bash
curl -I http://localhost:3080/widget.js
# Should show: Access-Control-Allow-Origin: *
```

3. Verify SimplePrint server is running:
```bash
curl http://localhost:3080/api/v1/products
# Should return JSON with products array
```

4. Check browser console for errors:
```
F12 → Console tab
Look for CORS errors, 404 errors, or JavaScript errors
```

### Issue 2: Products Not Displaying

**Symptoms:** Dropdown shows only "-- Choose a Product --"

**Solutions:**

1. Verify API response format:
```javascript
fetch('http://localhost:3080/api/v1/products')
  .then(r => r.json())
  .then(data => console.log(data));
// Should show: { products: [...] }
```

2. Check product isActive status:
```javascript
// Products should have isActive !== false
products.forEach(p => console.log(p.name, p.isActive));
```

3. Verify widget initialization:
```javascript
// Check mount point exists
console.log(document.querySelector('#calculator-widget'));
// Should not be null
```

### Issue 3: Price Not Calculating

**Symptoms:** Calculate button doesn't work or no price shown

**Solutions:**

1. Check required fields are filled:
```javascript
const productId = document.getElementById('sp-product').value;
const paperId = document.getElementById('sp-paper').value;
const quantity = document.getElementById('sp-quantity').value;
console.log({ productId, paperId, quantity });
// All should have values
```

2. Verify calculate API endpoint:
```bash
curl -X POST http://localhost:3080/api/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{"productId":"product-1","paperId":"paper-1","quantity":100}'
```

3. Check for JavaScript errors in console

### Issue 4: Quote Not Saving

**Symptoms:** "Failed to save quote" error

**Solutions:**

1. Check WordPress REST API is accessible:
```bash
curl http://yoursite.com/wp-json/simpleprint/v1/quotes \
  -H "X-WP-Nonce: YOUR_NONCE"
```

2. Verify database tables exist:
```sql
SHOW TABLES LIKE '%simpleprint%';
```

3. Check user permissions:
```php
<?php
var_dump(is_user_logged_in());
var_dump(current_user_can('read'));
?>
```

4. Enable WordPress debug mode:
```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
// Check wp-content/debug.log for errors
```

### Issue 5: CORS Errors

**Symptoms:** "Access to fetch blocked by CORS policy"

**Solutions:**

1. Add CORS headers in SimplePrint server:
```javascript
// In app.js
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
```

2. Add WordPress domain to allowed origins:
```javascript
const allowedOrigins = [
    'http://localhost:3088',
    'https://yourwordpresssite.com'
];
```

3. Serve widget.js with correct headers:
```javascript
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('widget.js')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));
```

### Issue 6: Database Connection Errors

**Symptoms:** "Error establishing database connection"

**Solutions:**

1. Check database credentials in wp-config.php
2. Verify tables were created during plugin activation
3. Re-activate the plugin to recreate tables
4. Check MySQL error logs

### Issue 7: Session Issues

**Symptoms:** Quotes not associating with logged-in users

**Solutions:**

1. Check session configuration:
```php
<?php
// Check if sessions are working
session_start();
$_SESSION['test'] = 'value';
var_dump($_SESSION);
?>
```

2. Verify user authentication:
```php
<?php
var_dump(is_user_logged_in());
var_dump(get_current_user_id());
?>
```

3. Clear cookies and cache, then login again

---

## Best Practices

### Performance Optimization

1. **Enable Caching:**
```php
<?php
// Cache products list for 5 minutes
$products = get_transient('simpleprint_products');
if ($products === false) {
    $products = simpleprint_api_request('/products');
    set_transient('simpleprint_products', $products, 5 * MINUTE_IN_SECONDS);
}
?>
```

2. **Lazy Load Widget:**
```javascript
// Only load widget when calculator section is in viewport
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadCalculatorWidget();
            observer.unobserve(entry.target);
        }
    });
});

observer.observe(document.getElementById('calculator-widget'));
```

3. **Minify and Combine Assets:**
```php
<?php
wp_enqueue_script('simpleprint-combined',
    get_template_directory_uri() . '/js/simpleprint.min.js',
    array(), '1.0', true);
?>
```

### User Experience

1. **Loading States:**
```javascript
function showLoading() {
    document.getElementById('calculator-widget').innerHTML =
        '<div class="loading">Loading calculator...</div>';
}

function hideLoading() {
    document.querySelector('.loading').remove();
}
```

2. **Error Messages:**
```javascript
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'calculator-error';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.getElementById('calculator-widget').prepend(errorDiv);
}
```

3. **Success Feedback:**
```javascript
function showSuccess(quoteId) {
    const successDiv = document.createElement('div');
    successDiv.className = 'calculator-success';
    successDiv.innerHTML = `
        <strong>Success!</strong> Quote #${quoteId} saved.
        <a href="/my-quotes?id=${quoteId}">View Quote</a>
    `;
    document.getElementById('calculator-widget').prepend(successDiv);
}
```

### Code Organization

1. **Separate concerns:**
   - Keep template files in `/templates`
   - Keep business logic in `/includes`
   - Keep admin code in `/admin`
   - Keep public code in `/public`

2. **Use WordPress coding standards:**
   - Follow WordPress PHP Coding Standards
   - Use WordPress functions (wp_remote_get instead of curl)
   - Prefix all functions and classes
   - Document with PHPDoc

3. **Version control:**
   - Use Git for version control
   - Tag releases properly
   - Maintain changelog
   - Document breaking changes

---

## Additional Resources

### Documentation Links

- [WordPress Plugin Development Handbook](https://developer.wordpress.org/plugins/)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [WordPress Database Class](https://developer.wordpress.org/reference/classes/wpdb/)
- [SimplePrint API Documentation](http://localhost:3080/api/docs)

### Support

- GitHub Issues: https://github.com/yourusername/simpleprint-calculator/issues
- Documentation: https://yoursite.com/docs
- Email: support@yoursite.com

---

## Changelog

### Version 1.0.0 (2025-10-03)

- Initial release
- Basic widget integration
- Quote saving and management
- Admin dashboard
- REST API endpoints
- Shortcode support
- Database schema
- Documentation

---

## License

This plugin is licensed under the GPL v2 or later.

```
This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
```

---

**Last Updated:** October 3, 2025
**Version:** 1.0.0
**Author:** SimplePrint Team
