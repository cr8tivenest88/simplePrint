document.addEventListener('DOMContentLoaded', function () {
    // Cache DOM elements
    const paperSelect = document.getElementById('paper-select');
    const quantitySelect = document.getElementById('quantity-select');
    const roundedCornersCheckbox = document.getElementById('rounded-corners');
    const doubleSidedCheckbox = document.getElementById('double-sided');
    const fileUpload = document.getElementById('file-upload');
    const totalPriceElement = document.getElementById('total-price');
    const cardQuantityElement = document.getElementById('card-quantity');
    const cardFront = document.getElementById('card-front');
    const cardBack = document.getElementById('card-back');
    const paperDescription = document.getElementById('paper-description');

    // Price calculation constants
    const QUANTITY_MULTIPLIERS = {
        50: 1,
        100: 1.5,
        500: 3,
        1000: 5,
        5000: 15
    };

    // Load paper data
    let paperData = [];
    let upgradesData = [];

    // Fetch paper and upgrade data
    Promise.all([
        fetch('/api/papers'),
        fetch('/api/upgrades')
    ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([papers, upgrades]) => {
            paperData = papers;
            upgradesData = upgrades;
            updatePaperDescription(); // Initial description update
        })
        .catch(error => console.error('Error loading data:', error));

    // Update paper description when selection changes
    function updatePaperDescription() {
        const selectedPaper = paperData.find(paper =>
            paper.name.toLowerCase() === paperSelect.value
        );
        if (selectedPaper) {
            paperDescription.textContent = selectedPaper.description;

            // Remove all finish classes
            cardFront.classList.remove('glossy', 'matte', 'uncoated', 'linen', 'kraft');
            // Add selected finish class
            cardFront.classList.add(selectedPaper.name.toLowerCase());

            if (cardBack.style.display !== 'none') {
                cardBack.classList.remove('glossy', 'matte', 'uncoated', 'linen', 'kraft');
                cardBack.classList.add(selectedPaper.name.toLowerCase());
            }
        }
    }

    // Calculate total price
    function calculateTotal() {
        const quantity = parseInt(quantitySelect.value);
        const multiplier = QUANTITY_MULTIPLIERS[quantity] || 1;

        // Get paper upgrade cost
        const selectedPaper = paperData.find(paper =>
            paper.name.toLowerCase() === paperSelect.value
        );
        const paperCost = selectedPaper ? selectedPaper.upgradeCost : 0;

        // Get upgrade costs
        let upgradeCost = 0;
        if (roundedCornersCheckbox.checked) {
            const roundedUpgrade = upgradesData.find(u => u.name === 'Rounded Corners');
            upgradeCost += roundedUpgrade ? roundedUpgrade.upgradeCost : 0;
        }
        if (doubleSidedCheckbox.checked) {
            const doubleSidedUpgrade = upgradesData.find(u => u.name === 'Double-Sided Printing');
            upgradeCost += doubleSidedUpgrade ? doubleSidedUpgrade.upgradeCost : 0;
        }

        // Calculate total
        const total = (BASE_PRICE * multiplier) + (paperCost + upgradeCost) * (quantity / 50);

        // Update display
        totalPriceElement.textContent = `$${total.toFixed(2)}`;
        cardQuantityElement.textContent = quantity;
    }

    // Event Listeners
    paperSelect.addEventListener('change', () => {
        updatePaperDescription();
        calculateTotal();
    });

    quantitySelect.addEventListener('change', calculateTotal);

    roundedCornersCheckbox.addEventListener('change', () => {
        cardFront.classList.toggle('rounded-corners');
        if (cardBack.style.display !== 'none') {
            cardBack.classList.toggle('rounded-corners');
        }
        calculateTotal();
    });

    doubleSidedCheckbox.addEventListener('change', () => {
        cardBack.style.display = doubleSidedCheckbox.checked ? 'flex' : 'none';
        calculateTotal();
    });

    fileUpload.addEventListener('change', () => {
        if (fileUpload.files.length > 0) {
            alert('File uploaded! In a real application, this would process the image.');
        }
    });

    // Initialize
    calculateTotal();
});
