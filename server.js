require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// import mongoose set-up
require("./database/Mongoose");

// import models
const Subscriptions = require("./model/Subscriptions");
const Products = require("./model/Products");

const STRIPE_KEY = process.env.STRIPE_KEY;

const PORT = process.env.PORT || 3030;
const stripe = require("stripe")(STRIPE_KEY);

app.use(cors());
app.use(express.json());

// this endpoint is used to create a new product 
// this product collection has a relationship with 
// subscriptions collection.
app.post("/api/v1/create-new-product", async (req, res) => {

    try {

        const { name, priceId, desc } = req.body

        const newProd = await Products.create({
            name: name,
            priceId: priceId,
            desc: desc
        })

        newProd.save()

        res.status(201).send({
            status: 201
        })
    } catch (e) {
        console.log(e);
        res.status(400).send()
    }

});

// TODO: Create Checkout Sessions
app.post("/api/v1/create-checkout-sessions", async (req, res) => {
    // Product's price id
    // Retrieved through front-end request
    const { priceId, customerEmail } = req.body;
    const host = req.headers.origin

    try {
        //  create new sessions => providing parameter
        //  more additional parameters are available here
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: customerEmail,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],

            // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
            // the actual Session ID is returned in the query parameter when your customer
            // is redirected to the success page.
            success_url:
                `${host}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${host}/profile`,
        });

        // After payment is successful
        // customer id must be stored alongside in the database
        // so the front-end should be able to configure the subscription
        // from the database not from query parameters
        const _cust = await Subscriptions.findOne({ email: customerEmail })

        if (!_cust) {
            await Subscriptions.create({
                email: customerEmail,
                sessionId: session.id,
            })
        } else {
            await _cust.updateOne({
                sessionId: session.id,
            })
        }

        res.send({
            sessionId: session.id,
        });
    } catch (e) {
        res.status(400);
        console.log(e);
        return res.send({
            error: {
                message: e.message,
            },
        });
    }
});


// TODO: After user managing their subscription? => send the session id to stripe
app.post("/api/v1/get-session-id", async (req, res) => {
    const { customerEmail } = req.body;
    const host = req.headers.origin

    await Subscriptions.findOne({ email: customerEmail }, async (err, value) => {
        if (!err) {

            // this is the checkout session code.
            // this code contains all informations about the subscription
            // that saved from previous successful transaction
            const checkoutSession = await stripe.checkout.sessions.retrieve(value.sessionId)

            const returnUrl = `${host}/profile`;

            // save the customer id that this callback provides
            // to the product collections on the database,
            // update product id on subscription's collection
            const productId = await stripe.subscriptions.retrieve(checkoutSession.subscription)
            const _product = await Products.findOne({ priceId: productId.plan.id })

            // after selecting data from database,
            // update the following: =>
            //                          1. Subscriptions ID
            //                          2. Customer ID (subscription)
            //                          3. Product ID
            //                          4. Push customer ID (product)
            const updateSubscriptions = await Subscriptions.findOneAndUpdate({ email: customerEmail }, {
                customerId: checkoutSession.customer,
                subscriptionId: checkoutSession.subscription,
                productId: _product._id
            })

            // Push customer id to Products
            const _subscription = await Subscriptions.findOne({ email: customerEmail })
            _product.customerId.push({ _id: _subscription._id })
            await _product.save()

            const portalSession = await stripe.billingPortal.sessions
                .create({
                    customer: checkoutSession.customer,
                    return_url: returnUrl,
                })

            res.send(portalSession);
        } else {
            res.status(404).send();
        }
    });
});



// TODO: Get all products
app.get('/api/v1/get-products', async (req, res) => {
    try {
        const products = await Products.find()

        res.send(products)
    } catch (e) {
        console.log(e);
        res.status(400).send()
    }
})

// TODO: Get user subscription details
app.post('/api/v1/get-user-subscription-detail', async (req, res) => {

    const { customerEmail } = req.body

    // find customer data
    const _customer = await Subscriptions.findOne({ email: customerEmail })

    // find prod
    const _product = await Products.findOne({ _id: _customer.productId })

    // check if user has a subscription or not
    // if not, simply return null value
    // if yes, bind up every single information that needed
    if (_customer.subscriptionId && _customer.customerId && _customer.productId) {
        // subscription detail 
        const _detail = await stripe.subscriptions.retrieve(_customer.subscriptionId)

        
        const result = {
            email: _customer.email,
            customerId: _customer.customerId,
            subscription: {
                subscriptionId: _detail.id,
                details: _product,
                plan: _detail.plan.id,
                active: _detail.plan.active,
                amount: _detail.plan.amount,
                currency: _detail.plan.currency,
                created: _detail.created,
                end: _detail.current_period_end,
            }
        }
        
        // send back to front end
        res.send(result)
    } else {
        const result = {
            email: _customer.email,
            customerId: null,
            subscription: null,
        }
        
        // send back to front end
        res.send(result)
    }
})

app.listen(PORT, console.log(`RUNNING ON PORT:${PORT}`));
