var express = require('express');

var app = express(); 

//create objects for library functions
var fortune = require('./lib/fortune.js');
var weather = require('./lib/weather.js');

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
    

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({extended: true}));

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

app.get('/', function(req, res) {
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

app.post('/process', function(req, res) {
    console.log('Form (From querystring): ' + req.query.form);
    console.log('CSRF Token (from hidden form field): ' +req.body._csrf);
    console.log('Name (from visible form field): ' + req.body.name);
    console.log('email (from visible form field): ' + req.body.email);
    res.redirect(303, '/thank-you');
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



