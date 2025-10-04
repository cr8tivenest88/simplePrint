// Initialize variables
let calculatorModal = null;

console.log('=== CALCULATOR.JS LOADED ===');

// Ensure required global variables are available
function checkGlobals() {
    const required = ['currentProduct', 'papers'];
    const missing = required.filter(name => !window[name]);
    if (missing.length > 0) {
        throw new Error(`Missing required global variables: ${missing.join(', ')}`);
    }
}

// Initialize calculator modal when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const modalElement = document.getElementById('priceCalculatorModal');
    if (modalElement) {
        calculatorModal = new bootstrap.Modal(modalElement);
    }
});

// Toast notification helper
function showNotification(title, message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.remove('bg-success', 'bg-danger', 'bg-info');
    toast.classList.add(`bg-${type}`);
    toast.classList.add('text-white');

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function openPriceCalculator() {
    console.log('=== openPriceCalculator CALLED ===');
    try {
        console.log('Opening calculator...');
        checkGlobals();

        // Initialize modal if not already done
        if (!calculatorModal) {
            console.log('Creating new modal instance');
            const modalElement = document.getElementById('priceCalculatorModal');
            if (!modalElement) {
                throw new Error('Calculator modal element not found');
            }
            calculatorModal = new bootstrap.Modal(modalElement);
        }

        // Set product name
        document.getElementById('productName').value = currentProduct.name;

        // Populate quantity options
        const quantitySelect = document.getElementById('quantitySelect');
        quantitySelect.innerHTML = currentProduct.quantityPrices.map(qp =>
            `<option value="${qp.quantity}" data-price="${qp.price}">${qp.quantity} cards - $${qp.price}</option>`
        ).join('');

        // Populate size options
        const sizeSelect = document.getElementById('sizeSelect');
        sizeSelect.innerHTML = currentProduct.sizes.map(size =>
            `<option value="${size.name}" data-multiplier="${size.priceMultiplier}">
                ${size.name} (${size.width}" × ${size.height}")
            </option>`
        ).join('');

        // Populate paper options - only show papers selected for this product
        const paperSelect = document.getElementById('paperSelect');
        const selectedPaperIds = currentProduct.selectedPaperIds || [];

        console.log('=== PAPER FILTERING DEBUG ===');
        console.log('currentProduct:', currentProduct);
        console.log('selectedPaperIds:', selectedPaperIds);
        console.log('all papers:', papers);

        // Filter papers based on product's selectedPaperIds
        let availablePapers = papers;
        if (selectedPaperIds && selectedPaperIds.length > 0) {
            availablePapers = papers.filter(paper => selectedPaperIds.includes(paper.id));
        }

        console.log('availablePapers after filtering:', availablePapers);

        const standardPapers = availablePapers.filter(p => p.category === 'standard');
        const premiumPapers = availablePapers.filter(p => p.category === 'premium');

        console.log('standardPapers:', standardPapers);
        console.log('premiumPapers:', premiumPapers);

        let paperOptions = '';

        if (standardPapers.length > 0) {
            paperOptions += `
                <optgroup label="Standard Papers">
                    ${standardPapers.map(paper => `
                        <option value="${paper.id}"
                                data-cost="${paper.upgradeCost}"
                                title="${paper.description}">
                            ${paper.name} - ${paper.thickness} ${paper.finish}
                        </option>
                    `).join('')}
                </optgroup>
            `;
        }

        if (premiumPapers.length > 0) {
            paperOptions += `
                <optgroup label="Premium Papers">
                    ${premiumPapers.map(paper => `
                        <option value="${paper.id}"
                                data-cost="${paper.upgradeCost}"
                                title="${paper.description}">
                            ${paper.name} - ${paper.thickness} ${paper.finish} (+$${paper.upgradeCost})
                        </option>
                    `).join('')}
                </optgroup>
            `;
        }

        paperSelect.innerHTML = paperOptions;

        // Populate upgrades
        const upgradesContainer = document.getElementById('upgradesContainer');
        upgradesContainer.innerHTML = currentProduct.upgrades.map(upgrade => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       id="upgrade_${upgrade.name}" 
                       data-cost="${upgrade.upgradeCost}"
                       onchange="calculatePrice()">
                <label class="form-check-label">
                    ${upgrade.name} (+$${upgrade.upgradeCost})
                    <small class="text-muted d-block">${upgrade.description}</small>
                </label>
            </div>
        `).join('');

        calculatePrice();
        calculatorModal.show();
    } catch (error) {
        console.error('Error opening calculator:', error);
        showNotification('Error', 'Failed to open calculator: ' + error.message, 'danger');
    }
}

function calculatePrice() {
    try {
        // Get base price from quantity
        const quantitySelect = document.getElementById('quantitySelect');
        const quantity = parseInt(quantitySelect.value);
        const basePrice = parseFloat(quantitySelect.selectedOptions[0].dataset.price);

        // Get size multiplier
        const sizeMultiplier = parseFloat(document.getElementById('sizeSelect').selectedOptions[0].dataset.multiplier);

        // Calculate paper upgrade cost
        const paperUpgradeCost = parseFloat(document.getElementById('paperSelect').selectedOptions[0].dataset.cost || 0);

        // Calculate additional upgrades cost
        const upgradesCost = Array.from(document.querySelectorAll('#upgradesContainer input[type="checkbox"]:checked'))
            .reduce((sum, checkbox) => sum + parseFloat(checkbox.dataset.cost), 0);

        // Calculate total
        const subtotal = basePrice * sizeMultiplier;
        const total = subtotal + paperUpgradeCost + upgradesCost;

        // Update price breakdown
        document.getElementById('priceBreakdown').innerHTML = `
            ${quantity ? '' : '<div class="alert alert-warning">Please select a quantity</div>'}
            <div class="mb-2">Base Price (${quantity} cards): $${basePrice.toFixed(2)}</div>
            ${sizeMultiplier !== 1 ? `
                <div class="mb-2">Size Multiplier: ${sizeMultiplier}x</div>
                <div class="mb-2">Subtotal after size: $${subtotal.toFixed(2)}</div>
            ` : ''}
            ${paperUpgradeCost > 0 ? `
                <div class="mb-2">Paper Upgrade: +$${paperUpgradeCost.toFixed(2)}</div>
            ` : ''}
            ${upgradesCost > 0 ? `
                <div class="mb-2">Additional Upgrades: +$${upgradesCost.toFixed(2)}</div>
            ` : ''}
            <div class="total mt-3">Total Price: $${total.toFixed(2)}</div>
            <div class="mt-1">Price per card: $${(total / quantity).toFixed(3)}</div>
        `;
    } catch (error) {
        console.error('Error calculating price:', error);
        document.getElementById('priceBreakdown').innerHTML = `
            <div class="alert alert-danger">
                Error calculating price: ${error.message}
            </div>
        `;
    }
}/* Cache buster updated */
// Version 4
