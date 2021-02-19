const mongoose = require('mongoose');


// create new schema model
// this should contain the following
// name , desc, array of customer id

const _products = new mongoose.Schema({

    name : {
        type: 'string',
        required: true,
        trim: true
    },
    priceId : {
        type: 'string',
        required: true,
    },
    desc : {
        type: 'string',
        required: true
    },
    customerId : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscriptions'
    }]

})


const Products = mongoose.model('Products', _products)
module.exports = Products 