var express = require('express');

var app = express(); 

var fortune = require('./lib/fortune.js');

//setup the handlebars view engine
var handlebars = require('express-handlebars')
    .create({ defaultLayout:'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(function(req,res,next) {
    res.locals.showTests = app.get('env') !== 'production' && 
        req.query.test === '1';
    next();
});

app.use(function(req, res, next) {
    if(!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weatherContext = getWeatherData();
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

 
function getWeatherData(){
    return {
        locations: [
            {
                name: 'Portland',
                forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloud.gif',
                weather: 'Overcast',
                temp: '54.1 F (12.3 C)',
            },
            {
                name: 'Bend',
                forecartUrl: 'http://www.wunderground.com/US/OR/Bend.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloud.gif',
                weather: 'Partly Cloudy',
                temp: '55.0 F (12.8 C)',
            },
        ],
    };
}


