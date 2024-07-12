require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Customer, Loan, Collection } = require('./models');

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });


app.get('/admin/customers', async (req, res) => {
    try {
        const customers = await Customer.find({});
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).send(error.message);
    }
});
// Create a new customer
app.post('/admin/customers', async (req, res) => {
    try {
        const { mobileNumber } = req.body;

        // Check if a customer with the same mobile number already exists
        const existingCustomer = await Customer.findOne({ mobileNumber });
        if (existingCustomer) {
            return res.status(400).send("Customer with this mobile number already exists");
        }

        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).send(customer);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// Edit a customer record
app.put('/admin/customers/:id', async (req, res) => {
    try {


        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.send(customer);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// Allot a new loan to a customer
app.post('/admin/loans', async (req, res) => {
    try {
        const { mobileNumber, loanId, amount, duration, dailyCollectable, startDate, endDate } = req.body;
        const customer = await Customer.findOne({ mobileNumber });

        if (!customer) {
            res.status(404).send("Customer not found");
            return;
        }

        const loan = new Loan({
            customer: customer._id,
            loanId,
            amount,
            duration,
            dailyCollectable,
            startDate,
            endDate
        });

        await loan.save();

        customer.loans.push(loan);
        await customer.save();

        res.status(201).send(loan);
    } catch (error) {
        res.status(400).send(error.message);
    }
});



app.post('/admin/collections/:loanid', async (req, res) => {
    try {
        const loanId = req.params.loanid;
        const { amount, isActive } = req.body;
        console.log(loanId)
        let loan;
        if (loanId) {
            loan = await Loan.findById(loanId);
        }
        if (!loan) {
            return res.status(404).send('Loan not found');
        }

        const collection = new Collection({ loan: loan._id, amount });
        await collection.save();

        loan.collectedAmount += amount;
        loan.isActive = isActive;
        await loan.save();
        const customer = await Customer.findOneAndUpdate(
            { 'loans._id': loan._id },
            {
                $set: {
                    'loans.$.collectedAmount': loan.collectedAmount,
                    'loans.$.isActive': loan.isActive
                }
            },
            { new: true }
        );

        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        res.send(collection);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.post('/agent/collections/:loanid', async (req, res) => {
    try {
        const loanId = req.params.loanid;
        const { amount, isActive } = req.body;

        let loan;
        if (loanId) {
            loan = await Loan.findById(loanId);
        }

        if (!loan) {
            return res.status(404).send('Loan not found');
        }

        const collection = new Collection({ loan: loan._id, amount });
        await collection.save();

        loan.collectedAmount += amount;
        loan.isActive = isActive;
        await loan.save();
        const customer = await Customer.findOneAndUpdate(
            { 'loans._id': loan._id },
            {
                $set: {
                    'loans.$.collectedAmount': loan.collectedAmount,
                    'loans.$.isActive': loan.isActive
                }
            },
            { new: true }
        );

        if (!customer) {
            return res.status(404).send('Customer not found');
        }


        res.send(collection);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.get('/reports/general', async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();
        const activeLoans = await Loan.countDocuments({ isActive: true });
        const dailyCollectables = await Loan.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: "$dailyCollectable" } } }
        ]);
        const dailyCollections = await Collection.aggregate([
            { $match: { date: { $gte: new Date().setHours(0, 0, 0, 0) } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const defaulters = await Loan.find({
            endDate: { $lt: new Date() },
            isActive: true
        });
        res.send({
            totalCustomers,
            activeLoans,
            dailyCollectables: dailyCollectables[0]?.total || 0,
            dailyCollections: dailyCollections[0]?.total || 0,
            defaulters
        });
    } catch (error) {
        res.status(400).send(error.message);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
