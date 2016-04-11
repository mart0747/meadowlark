var assert = require('chai').assert;
var http = require('http');
var rest = require('restler');

suite('API tests', function(){
    var attraction = {
        lat: 45.516011,
        lng: -122.682062,
        name: 'Portland Art Museum',
        description: 'Founded in 1892. the Portland Art Museum is a collection of native art',
        email: 'test@meadowlarktravel.com',
    };
    
    var base = 'http://localhost:3000';
    
    test('should be able to add an attraction', function(done){ 
        rest.post(base+'/api/attraction', {data:attraction}).on('success', function(data){
            assert.match(data.id, /\w/, 'id must be set');
            done();
        });
    });
    
    test('should be able to retreive an attraction', function(done){
        rest.post(base+'/api/attraction', {data:attraction}).on('success', function(data){
            rest.get(base+'/api/attraction/'+data.id).on('success', function(data){
                assert(data.name === attraction.name);
                assert(data.desecription === attraction.descrtiption);
                done();
            })
        });
    });
});

