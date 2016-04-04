var locations = [
    {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloud.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)'
    },
    {
        name: 'Bend',
        forecartUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloud.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)'
    }
];


exports.getWeatherData = function () {
    return locations;
};
