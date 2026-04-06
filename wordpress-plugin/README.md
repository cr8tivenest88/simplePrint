# SimplePrint Calculator — WordPress Plugin

Embeds the SimplePrint pricing calculator widget into any WordPress page or post via shortcode.

## Install

1. Copy the `simpleprint-calculator/` folder into your WordPress `wp-content/plugins/` directory.
2. Activate **SimplePrint Calculator** under **Plugins** in the WordPress admin.
3. (Optional) Go to **Settings → SimplePrint** to change the API URL (defaults to `https://simpleprint.fly.dev`).

## Usage

Add the shortcode to any page or post:

```
[simpleprint_calculator]
```

Or target a specific product directly:

```
[simpleprint_calculator product_id="1"]
```

## How it works

- Loads `widget.js` from the configured SimplePrint API host
- Initializes `SimplePrintWidget` on a container div
- Widget fetches products from `/api/v1/products` and calculates prices via `/api/v1/calculate`

## Requirements

- WordPress 5.0+
- The SimplePrint API must be reachable from the browser (CORS must allow the WordPress site origin — see `middleware/cors.js` in the SimplePrint repo)
