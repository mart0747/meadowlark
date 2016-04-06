var express = require('express');

var app = express(); 

//create objects for library functions
var fortune = require('./lib/fortune.js');
var weather = require('./lib/weather.js');
var credentials = require('./credentials.js');

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

//use formidable for file uploads
var formidable = require('formidable');

//from http://blog.gerv.net/2011/05/html5_email_address_regexp/
var VALID_EMAIL_REGEX = new RegExp(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?)*$/);

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

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

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
	cb();
};

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



