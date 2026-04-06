(function() {
  'use strict';

  // Widget namespace
  window.SimplePrintWidget = {
    init: function(config) {
      const {
        mountPoint,
        productId = null,
        onPayload = () => {},
        onError = () => {}
      } = config;

      const container = typeof mountPoint === 'string'
        ? document.querySelector(mountPoint)
        : mountPoint;

      if (!container) {
        console.error('SimplePrintWidget: Mount point not found');
        return null;
      }

      // Get the calculator host from script src or use default
      const scriptSrc = document.currentScript?.src || '';
      const calculatorHost = scriptSrc.split('/widget.js')[0] || 'http://localhost:3080';

      // Widget state
      let products = [];
      let selectedProduct = null;
      let currentPayload = null;

      // Create widget HTML structure
      function createWidgetHTML() {
        container.innerHTML = `
          <div class="sp-widget">
            <div class="sp-widget-loading" id="sp-loading">Loading products...</div>
            <div class="sp-widget-error" id="sp-error" style="display:none;"></div>
            <div class="sp-widget-form" id="sp-form" style="display:none;">
              <div class="sp-form-group">
                <label for="sp-product">Select Product:</label>
                <select id="sp-product" required>
                  <option value="">-- Choose a Product --</option>
                </select>
              </div>
              <div id="sp-product-details" style="display:none;">
                <div class="sp-form-group">
                  <label for="sp-paper">Paper Type:</label>
                  <select id="sp-paper" required>
                    <option value="">-- Choose Paper --</option>
                  </select>
                </div>
                <div class="sp-form-group">
                  <label for="sp-quantity">Quantity:</label>
                  <select id="sp-quantity" required>
                    <option value="">-- Choose Quantity --</option>
                  </select>
                </div>
                <div class="sp-form-group">
                  <label for="sp-color-front">Front Color:</label>
                  <select id="sp-color-front" required>
                    <option value="">-- Choose Front Color --</option>
                  </select>
                </div>
                <div class="sp-form-group">
                  <label for="sp-color-back">Back Color:</label>
                  <select id="sp-color-back" required>
                    <option value="">-- Choose Back Color --</option>
                  </select>
                </div>
                <div class="sp-form-group">
                  <label>Upgrades (Optional):</label>
                  <div id="sp-upgrades-container">
                    <!-- Upgrade checkboxes will be populated here -->
                  </div>
                </div>

                <!-- Live price display -->
                <div id="sp-price-display" style="display:none; margin-top: 20px; padding: 15px; background: #f0f7fb; border-radius: 4px;">
                  <div id="sp-price-loading" style="display:none;">Calculating...</div>
                  <div id="sp-price-content" style="display:none;">
                    <h3 style="margin: 0 0 10px 0;">Quote Summary</h3>
                    <div id="sp-price-details"></div>
                  </div>
                </div>

                <button type="button" id="sp-save-quote-btn" class="sp-btn-primary" style="display:none; margin-top: 15px;">Save Quote</button>
              </div>
            </div>
          </div>
        `;
      }

      // Fetch products from API
      async function loadProducts() {
        try {
          const response = await fetch(`${calculatorHost}/api/v1/products`);
          if (!response.ok) throw new Error('Failed to load products');

          const result = await response.json();
          products = result.products || result.data || [];

          populateProductSelect();

          document.getElementById('sp-loading').style.display = 'none';
          document.getElementById('sp-form').style.display = 'block';
        } catch (error) {
          showError('Failed to load products: ' + error.message);
          onError(error);
        }
      }

      // Populate product dropdown
      function populateProductSelect() {
        const select = document.getElementById('sp-product');
        const productFormGroup = select.closest('.sp-form-group');

        products.forEach(product => {
          // Show product if isActive is true or undefined (not explicitly set to false)
          if (product.isActive !== false) {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
          }
        });

        // If productId provided, select it and hide the dropdown
        if (productId) {
          select.value = productId;
          if (productFormGroup) {
            productFormGroup.style.display = 'none';
          }
          handleProductChange();
        }
      }

      // Handle product selection change
      async function handleProductChange() {
        const productId = document.getElementById('sp-product').value;
        if (!productId) {
          document.getElementById('sp-product-details').style.display = 'none';
          return;
        }

        try {
          // Fetch product details to get availablePapers
          const response = await fetch(`${calculatorHost}/api/v1/products/${productId}`);
          if (!response.ok) throw new Error('Failed to load product details');

          const result = await response.json();
          selectedProduct = result.data || result;

          // Populate papers dropdown with product's available papers
          const paperSelect = document.getElementById('sp-paper');
          paperSelect.innerHTML = '<option value="">-- Choose Paper --</option>';

          const availablePapers = selectedProduct.availablePapers || [];
          availablePapers.forEach(paper => {
            const option = document.createElement('option');
            option.value = paper.id;
            option.textContent = paper.name;
            paperSelect.appendChild(option);
          });

          // Populate quantity dropdown with product's quantity prices
          const quantitySelect = document.getElementById('sp-quantity');
          quantitySelect.innerHTML = '<option value="">-- Choose Quantity --</option>';

          const quantityPrices = selectedProduct.quantityPrices || [];
          quantityPrices.forEach(qp => {
            const option = document.createElement('option');
            option.value = qp.quantity;
            option.textContent = `${qp.quantity} units`;
            quantitySelect.appendChild(option);
          });

          // Populate color dropdowns with product's available colors
          const colorOptions = ['Color', 'Black', 'No Print'];
          const frontColorSelect = document.getElementById('sp-color-front');
          const backColorSelect = document.getElementById('sp-color-back');

          frontColorSelect.innerHTML = '';
          backColorSelect.innerHTML = '<option value="">-- Choose Back Color --</option>';

          colorOptions.forEach(color => {
            const frontOption = document.createElement('option');
            frontOption.value = color;
            frontOption.textContent = color;
            frontColorSelect.appendChild(frontOption);

            const backOption = document.createElement('option');
            backOption.value = color;
            backOption.textContent = color;
            backColorSelect.appendChild(backOption);
          });

          // Default front color to "Color"
          frontColorSelect.value = 'Color';

          // Populate upgrades as checkboxes
          const upgradesContainer = document.getElementById('sp-upgrades-container');
          upgradesContainer.innerHTML = '';
          const availableUpgrades = selectedProduct.upgrades || [];
          availableUpgrades.forEach((upgrade, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.style.marginBottom = '8px';
            checkboxDiv.innerHTML = `
              <label style="display: flex; align-items: flex-start; cursor: pointer;">
                <input type="checkbox" class="sp-upgrade-checkbox" value="${upgrade.name}"
                       style="margin-right: 8px; margin-top: 3px;">
                <span>
                  <strong>${upgrade.name} (+$${upgrade.upgradeCost})</strong>
                  ${upgrade.description ? `<br><small style="color: #666;">${upgrade.description}</small>` : ''}
                </span>
              </label>
            `;
            upgradesContainer.appendChild(checkboxDiv);
          });

          // Attach event listeners to upgrade checkboxes
          upgradesContainer.querySelectorAll('.sp-upgrade-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', autoCalculate);
          });

          document.getElementById('sp-product-details').style.display = 'block';
        } catch (error) {
          showError('Failed to load product details: ' + error.message);
          console.error('Error loading product details:', error);
        }
      }

      // Auto-calculate price when inputs change
      async function autoCalculate() {
        const productId = document.getElementById('sp-product').value;
        const paperId = document.getElementById('sp-paper').value;
        const quantity = parseInt(document.getElementById('sp-quantity').value);

        const colorFront = document.getElementById('sp-color-front').value;
        const colorBack = document.getElementById('sp-color-back').value;

        // Only calculate if all required fields are filled
        if (!productId || !paperId || !quantity || quantity < 1 || !colorFront || !colorBack) {
          document.getElementById('sp-price-display').style.display = 'none';
          document.getElementById('sp-save-quote-btn').style.display = 'none';
          return;
        }

        // Show loading
        document.getElementById('sp-price-display').style.display = 'block';
        document.getElementById('sp-price-loading').style.display = 'block';
        document.getElementById('sp-price-content').style.display = 'none';

        // Get selected upgrades from checkboxes
        const upgradeNames = Array.from(document.querySelectorAll('.sp-upgrade-checkbox:checked'))
          .map(checkbox => checkbox.value);

        console.log('Selected upgrades:', upgradeNames);

        try {
          // Get size from selected product
          const size = selectedProduct?.sizes?.[0]?.name || 'Standard US';

          const response = await fetch(`${calculatorHost}/api/v1/calculate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              productId,
              paperId,
              quantity,
              size,
              colorFront,
              colorBack,
              upgradeNames
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Calculation failed');
          }

          const result = await response.json();
          const data = result.data || result;

          console.log('API Response:', data);
          console.log('Applied Upgrades:', data.appliedUpgrades);

          // Store current calculation
          currentPayload = data;
          // Expose payload globally so embedding pages (e.g. WooCommerce) can read it.
          window.__sp_currentPayload = data;
          window.dispatchEvent(new CustomEvent('simpleprint:payload', { detail: data }));

          // Display price
          document.getElementById('sp-price-loading').style.display = 'none';
          document.getElementById('sp-price-content').style.display = 'block';

          const totals = data.totals || {};

          // Build line items breakdown
          let lineItemsHTML = '';
          if (data.lineItems && data.lineItems.length > 0) {
            lineItemsHTML += '<table style="width:100%; border-collapse:collapse; margin:10px 0; font-size:0.9em;">';
            lineItemsHTML += '<thead><tr style="border-bottom:2px solid #ccc; text-align:left;">';
            lineItemsHTML += '<th style="padding:4px 8px;">Description</th>';
            lineItemsHTML += '<th style="padding:4px 8px; text-align:right;">Amount</th>';
            lineItemsHTML += '</tr></thead><tbody>';
            data.lineItems.forEach(item => {
              lineItemsHTML += `<tr style="border-bottom:1px solid #eee;">`;
              lineItemsHTML += `<td style="padding:4px 8px;">${item.description}</td>`;
              lineItemsHTML += `<td style="padding:4px 8px; text-align:right;">$${item.total.toFixed(2)}</td>`;
              lineItemsHTML += `</tr>`;
            });
            lineItemsHTML += '<tr style="border-top:2px solid #333; font-weight:bold;">';
            lineItemsHTML += `<td style="padding:6px 8px;">Grand Total</td>`;
            lineItemsHTML += `<td style="padding:6px 8px; text-align:right;">$${(totals.grandTotal || 0).toFixed(2)}</td>`;
            lineItemsHTML += '</tr>';
            lineItemsHTML += '</tbody></table>';
          }

          document.getElementById('sp-price-details').innerHTML = `
            <p style="margin: 10px 0; font-size: 1.3em;"><strong>Total Price: $${(totals.grandTotal || 0).toFixed(2)}</strong></p>
            <p style="margin: 5px 0; color: #666;">Price per card: $${(totals.unitPrice || 0).toFixed(3)}</p>
            ${lineItemsHTML}
          `;

          document.getElementById('sp-save-quote-btn').style.display = 'block';

          // Call the payload callback
          onPayload(data);

        } catch (error) {
          document.getElementById('sp-price-loading').style.display = 'none';
          document.getElementById('sp-price-content').style.display = 'block';
          document.getElementById('sp-price-details').innerHTML = `<p style="color: #dc3232;">Error: ${error.message}</p>`;
          onError(error);
        }
      }

      // Handle save quote button click
      function handleSaveQuote() {
        if (currentPayload) {
          onPayload(currentPayload);
        }
      }

      // Show error message
      function showError(message) {
        const errorDiv = document.getElementById('sp-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 5000);
      }

      // Initialize widget
      createWidgetHTML();
      loadProducts();

      // Attach event listeners
      document.getElementById('sp-product').addEventListener('change', handleProductChange);
      document.getElementById('sp-paper').addEventListener('change', function() {
        if (this.value) {
          const frontSelect = document.getElementById('sp-color-front');
          const backSelect = document.getElementById('sp-color-back');
          if (!frontSelect.value) frontSelect.value = 'Color';
          if (!backSelect.value) backSelect.value = 'Color';
        }
        autoCalculate();
      });
      document.getElementById('sp-quantity').addEventListener('change', autoCalculate);
      document.getElementById('sp-color-front').addEventListener('change', autoCalculate);
      document.getElementById('sp-color-back').addEventListener('change', autoCalculate);
      // Note: Upgrade checkboxes are attached dynamically when product is selected (see handleProductChange)
      document.getElementById('sp-save-quote-btn').addEventListener('click', handleSaveQuote);

      // Return widget API
      return {
        reload: loadProducts,
        setProduct: (id) => {
          document.getElementById('sp-product').value = id;
          handleProductChange();
        }
      };
    }
  };
})();
