function someAction() {
    grecaptcha.ready(function() {
        grecaptcha.execute('SITE_KEY', {action: 'submit'}).then(function(token) {
            console.log(token);
        });
    });
}