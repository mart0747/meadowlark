module.exports = function(grunt){
    
    //configure plugins
    grunt.initConfig({
        cafemocha: {
            all: { src: 'qa/tests-*.js', options: { ui: 'tdd' } }
        },
        jshint: {
            app: ['meadowlark.js', 'public/js/**/*.js',
                    'lib/**/*.js'],
            qa: ['Gruntfile.js','public/qa/**/*.js','qa/**/*.js']
        }
                  
        });    
   
    grunt.loadNpmTasks('grunt-cafe-mocha');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    
    //register tasks
    grunt.registerTask('default', ['cafemocha', 'jshint']); 
};
