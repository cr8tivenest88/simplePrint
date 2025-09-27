const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    priceMultiplier: {
        type: Number,
        required: true,
        default: 1
    }
});

const paperTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    thickness: {
        type: String,
        required: true
    },
    finish: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    upgradeCost: {
        type: Number,
        required: true,
        default: 0
    }
});

const upgradeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    upgradeCost: {
        type: Number,
        required: true
    }
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    sizes: [sizeSchema],
    paperTypes: [paperTypeSchema],
    upgrades: [upgradeSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
productSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Product', productSchema);
