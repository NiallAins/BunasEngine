requirejs.config({
    baseUrl: 'lib',
    paths: {
        'main': '../src'
    }
});

requirejs(['main'], function(App) {
    App.Game.init();
});