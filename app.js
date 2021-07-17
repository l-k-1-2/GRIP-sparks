const {
    MongoClient
} = require("mongodb");
const express = require("express");
const bodyParser = require('body-parser');
var app = express();
var uri = "mongodb+srv://mydatabase:mydatabase@cluster0.ozajz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

app.use('/', express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');

async function createListing(newListing, collection) {
    var client = new MongoClient(uri);
    try {
        await client.connect();
        const cursor = client.db("BankDB").collection(collection).find();
        var results = await cursor.toArray();
        var no = results.length + 1;
        var str = "" + no
        var pad = "000";
        var ans = pad.substring(0, pad.length - str.length) + str
        console.log(ans);
        if(collection=="customers")
        newListing._id = "Cust" + ans;
        else
        newListing._id = "Recp"+ans
        var result = await client.db("BankDB").collection(collection).insertOne(newListing);
        client.close();
        return newListing;
    } catch (error) {
        console.log(error);
    }
}

async function Fetch(collection) {
    var client = new MongoClient(uri);
    try {
        await client.connect();
        var sort = {
            _id: 1
        };
        const cursor = client.db("BankDB").collection(collection).find().sort(sort);
        results = await cursor.toArray();
        console.log(results);
        client.close();
        return results;
    } catch (err) {
        console.log(err);
    }
}

async function update(collection, sender, reciever, amount) {
    var client = new MongoClient(uri);
    try {
        await client.connect();
        const cursor = client.db("BankDB").collection(collection).find();
        amount = parseInt(amount);
        var query = {
            _id: sender._id
        }
        var newbal = sender.balance - amount;
        var update = {
            $set: {
                balance: newbal
            }
        }
        client.db("BankDB").collection(collection).updateOne(query, update, (err) => {
            if (err)
                throw err;
            else {
                console.log("Updated succesfully");
            }
        });

        console.log("-----Addition----------");
        var query = {
            _id: reciever._id
        };
        var newbal = reciever.balance + amount;
        var update = {
            $set: {
                balance: newbal
            }
        }
        client.db("BankDB").collection(collection).updateOne(query, update, (err) => {
            if (err)
                throw err;
            else {
                console.log("Updated succesfully");
            }
        });
        client.close();
    } catch (err) {
        console.log(err);
    }
}

var results, sender, reciever;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Views/homepage.html')
});

app.get("/Sender", async (req, res) => {
    results = await Fetch('customers');
    res.render(__dirname + '/Views/transaction.ejs', {
        customer: results
    })
});

app.post('/payment-:a', async (req, res) => {
    results = await Fetch('customers');
    console.log(req.body);
    var a = req.params.a;
    var str = "" + a
    var pad = "000";
    var ans = pad.substring(0, pad.length - str.length) + str
    sender="Cust"+ans;
    for (var i = 0; i < results.length; i++) {
        if (results[i]._id == sender) {
            sender = results[i];
            results.splice(i, 1);
        }
    }
    res.render(__dirname + "/Views/payment.ejs", {
        customer: results,
        sender: sender,
        status: ""
    });
});

app.post('/transaction', async (req, res) => {
    console.log(sender);
    var trans = {
        "amount": -1,
        "reciever": ""
    };

    for (var i = 0; i < results.length; i++) {
        if (results[i]._id == req.body.reciever) {
            reciever = results[i];
            trans.amount = req.body.amount;
            trans.reciever = req.body.reciever;
        }
    }

    if (trans.amount > sender.balance) {
        res.render(__dirname + "/Views/payment.ejs", {
            customer: results,
            sender: sender,
            status: "Insufficient account balance for transaction"
        });
    } else if (trans.amount == 0) {
        res.render(__dirname + "/Views/payment.ejs", {
            customer: results,
            sender: sender,
            status: "Please enter a valid amount"
        });
    } else if (trans.reciever != "") {
        await update("customers", sender, reciever, trans.amount);
        var reciepts = await Fetch('Reciepts');
        var reciept = {
            "_id": reciepts.length,
            "senderID": sender._id,
            "recieverID": reciever._id,
            "Transaction_Amount": trans.amount
        }
        createListing(reciept, 'Reciepts');
        res.redirect('/redirect');
    } else {
        res.render(__dirname + "/Views/payment.ejs", {
            customer: results,
            sender: sender,
            status: "Please select a reciever"
        });
    }
});

app.get('/redirect', (req, res) => {
    res.sendFile(__dirname + '/Views/redirect.html');
});

app.get('/Reciepts', async (req, res) => {
    var rec = await Fetch('Reciepts');
    res.render(__dirname + "/Views/Reciept.ejs", {
        reciepts: rec
    })
});

app.get('/CreateAccount', async (req, res) => {
    res.sendFile(__dirname + "/Views/CreateAccount.html");
});

app.post('/CreateUser', async (req, res) => {
    var newListing = {
        "_id": "0",
        "name": req.body.name,
        "email": req.body.email,
        "balance": parseInt(req.body.balance)
    }
    console.log(newListing);
    newListing= await createListing(newListing, "customers");
    res.render(__dirname+"/Views/userredirect.ejs",{
        info:newListing
    })
});

app.listen(process.env.PORT || 4000);
