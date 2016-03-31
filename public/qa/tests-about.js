suite('About Page Tests', function(){
    test('page should contain a link to contact page', function(){
        assert($('a[href="/contact"]').length);
    });
});