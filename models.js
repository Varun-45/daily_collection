const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: String,
    mobileNumber: String,

    loans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Loan' }]
});

const loanSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    amount: Number,
    duration: Number,
    dailyCollectable: Number,
    collectedAmount: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    isActive: { type: Boolean, default: true }
});

const collectionSchema = new mongoose.Schema({
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    amount: Number,
    date: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);
const Loan = mongoose.model('Loan', loanSchema);
const Collection = mongoose.model('Collection', collectionSchema);

module.exports = { Customer, Loan, Collection };
