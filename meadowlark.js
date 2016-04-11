var express = require('express');
var app = express(); 

//create objects for library functions
var fortune = require('./lib/fortune.js');
var weather = require('./lib/weather.js');
var credentials = require('./credentials.js');
var Vacation = require('./models/vacation.js');
var cartValidation = require('./lib/cartValidation.js');
var nodemailer = require('nodemailer'); 
var formidable = require('formidable'); //for file uploads


//setup the handlebars view engine
var handlebars = require('express-handlebars').create({ 
    defaultLayout:'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections= {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});

//initialize the DB and DB Connection
var dbURI = 'mongodb://localhost';
var mongoose = require('mongoose');
var opts = {
    server: {
        socketOptions : {keepalive : 1}
    }
};

mongoose.connect(dbURI, opts);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
    console.log('Mongoose default connection open to ' + dbURI);
}); 

// If the connection throws an error
mongoose.connection.on('error',function (err) {  
    console.log('Mongoose default connection error: ' + err);
}); 

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {  
    console.log('Mongoose default connection disconnected'); 
});

Vacation.find(function(err, vacations){
    if(err) 
        return console.error(err);
    
    if(vacations.length) 
        return;
    
    new Vacation({
        name: 'Hood River Day Trip',
        slug: 'hood-river-day-trip',
        category: 'Day Trip',
        sku: 'HR199',
        description: 'Spend a day sailing on the Columbia',
        priceInCents: 9995,
        tags: ['day trip', 'hood river', 'sailing', 'breweries'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0,
    }).save();
});

//from http://blog.gerv.net/2011/05/html5_email_address_regexp/
var VALID_EMAIL_REGEX = new RegExp(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?)*$/);

var mailTransport = nodemailer.createTransport('SMTP', {
    service: 'Gmail', 
    auth: {
        user: credentials.gmail.user,
        pass: credentials.gmail.password,
    }
});

//--now that everything is ready to go, initialize the app---
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(require('cors')()); 
app.use('/api', require('cors')()); 

app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({extended: true}));
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')( {
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret }));

app.use(function(req,res,next) {
    res.locals.showTests = app.get('env') !== 'production' && 
        req.query.test === '1';
    next();
});

app.use(function(req, res, next) {
    if(!res.locals.partials) res.locals.partials = {};
    var locations = weather.getWeatherData(); 
    res.locals.partials.weatherContext = locations;
    next();
});

app.use(function(req, res, next) { 
    //if there is a flash message, transfer it to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash; 
    next();
}); 

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
	cb();
};


//
//API Routes
//
var Attraction = require('./models/attraction.js');

app.get('/api/attractions', function(req,res){
   Attraction.find({ approved: true }, function(err, attractions){
       if(err) 
           return res.status(500).send('error occurred: database error.');
       
       res.json(attractions.map(function(a){
           return {
               name: a.name,
               id: a._id,
               description: a.description,
               location: a.location,
           }
       }));
   }); 
});

app.post('/api/attraction', function(req,res){
    
    console.log('[' + req.originalUrl + ']'); 
    console.log(req.body);
    
    var a = new Attraction({
        name: req.body.name,
        description: req.body.description,
        location: {lat: req.body.lat, lng: req.body.lng },
        history: {
            event: 'created', 
            email: req.body.email,
            date: new Date(),
        },
        approved: false,
    });
    
    a.save(function(err, a){
        if(err) return res.status(500).send('Error occurred: databse error.');
        res.json({ id: a._id });
        
    });
});

app.get('/api/attraction/:id', function(req,res){
    
    console.log('[' + req.originalUrl + ']');
    
    Attraction.findById(req.params.id, function(err, a){
        if(err) {
            console.log('[' + req.originalUrl + ']' + err);   
            return res.status(500).send('Error occured: database error.');
        }
        
        console.log( a ); 
        res.json({
            name: a.name,
            id: a._id,
            description: a.description,
            location: a.location,
        });
        
    })
    
});

//
//routes from here to the end of file.
//
app.get('/', function(req, res) {
    res.render('home');
    res.cookie('monster', 'nom nom');
});

app.get('/thank-you', function(req,res) {
    res.render('home');
}); 

app.get('/about', function(req, res) {
    res.render('about', { 
            fortune : fortune.getFortune(),
            pageTestScript: '/qa/tests-about.js' 
    });
});

app.get('/newsletter', function(req, res) {
    res.render('newsletter', {csrf : 'CSRF token goes here' });
});

app.post('/newsletter', function(req, res) {
    var name = req.body.name || '', email = req.body.email || '';
    
    if(!email.match(VALID_EMAIL_REGEX)) {
        if(req.xhr) 
            return res.json({ error: 'Invalid name email address.' });
        
        req.session.flash = {
            type: 'danger',
            intro: 'Validation Error!',
            message: 'The email address you entered was not valid',
        };
        
        return res.redirect(303, 'newsletter/archive');
    }
    
    new NewsletterSignup({ name: name, email: email }).save(function(err){
        if(err) {
            if(req.xhr) 
                return res.json({ error: 'Database error.' });
            
            req.session.flash = {
                type: 'danger',
                intro: 'Database error!',
                message: 'There was a database error; please try again later.',
            };
            
            return res.redirect(303, 'newsletter/archive');
        }
        
        if(req.xhr) 
            return res.json({ success: true });
        
        req.session.flash = {
            type: 'success',
            intro: 'Thank you!',
            message: 'You have been signed up for the newsletter.',
        };
        
        return res.redirect(303, 'newsletter/archive');
    });
                                                            
});

app.get('newsletter/archive', function(req,res) {
   res.render('archive'); 
});
    
app.post('/process', function(req, res) {
    if(req.xhr || req.accepts('json,html')==='json'){
        res.send({ success: true });
        console.log( 'processing request' + 'req.xhr = ' + req.xhr );
    } else {
        res.redirect(303, '/thank-you');
        console.log( 'thank you. redirect 303. req.xhr = ' + req.xhr );
    }
});

app.get('/contest/vacation-photo', function(req,res){
    var now = new Date();
    var month = now.getMonth();
    var year = now.getFullYear();
    console.log('Year: ' + year + '\n' + 'Month: ' + month); 
    res.render('contest/vacation-photo', 
               { year: year, month: month} ); 
});

app.post('/contest/vacation-photo/:year/:month', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) return res.redirect(303, '/error');
        console.log('received fields: ');
        console.log(fields);
        console.log('received files');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});
                
app.get('/jquery', function(req, res) {
    res.render('jquery-test');
});

app.get('/headers', function(req,res) {
    res.set('Content-Type','text/plain');
    var s = '';
    for (var name in req.headers) s+= name + ': ' + req.headers[name] + '\n';
    res.send(s);
});

app.get('/tours/hood-river', function(req, res) {
    res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res) {
    res.render('tours/request-group-rate');
});


app.get('/vacations', function(req,res){
    Vacation.find({ available:true }, function(err, vacations){
        console.log(vacations);
        var context = { 
            vacations: vacations.map(function(vacation){
                return {
                    sku: vacation.sku,
                    name: vacation.name,
                    description: vacation.description,
                    price: vacation.getDisplayPrice(),
                    inSeason: vacation.inSeason,
                }
            })
        };
        
        res.render('vacations', context);
    });
});

app.post('/cart/checkout', function(req, res){
    var cart = req.session.cart;
    if(!cart) 
        next(new Error('Cart does not exist.'));
    
    var name = req.body.name || '', email = req.body.email || '';
    
    if(!email.match(VALID_EMAIL_REGEX))
        return res.next(new Error('Invalid email address.'));
    
    //assign random cart ID; normally we would use a DB here....
    cart.number = Math.random().toString().replace(/^0\.0/, "");
    cart.billing = {
        name: name,
        email: email,
    };
    
    res.render('email/cart-thank-you',
       { layout: null, cart: cart}, function(err, html){
            if( err ) console.log('error in email template');
            mailTransport.sendMail({
                from: '"Meadowlark Travel": info@meadowlarktravel.com', 
                to: cart.billing.email,
                subject: "Thank you for booking!",
                html: html,
                generateTextFromHtml: true
            }, function(err){ 
                    if(err) console.error('Unable to send confirmation: ' +err.stack); 
            });
        }
    );
    res.render('cart-thank-you', { cart: cart });
                                                
}); 


//custom 404 page
app.use(function(req,res){
    console.log(req.url);
    console.log(req.method);
    res.status(404);
    res.render('404');
});

//custom 500 page
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

app.listen(app.get('port'), function() {
    console.log( 'Express started: ' + app.get('port') +'; press Ctrl-c to terminate.' );
});

