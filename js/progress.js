(function() {
    var _fn = {},
        fn = {};

    _fn.prog = document.getElementById('progress');
    _fn.spin = document.querySelectorAll('.spinner')[0];
    _fn.fill = document.querySelectorAll('.filler')[0];
    _fn.mask = document.querySelectorAll('.mask')[0];

    fn.change = function() {

        if (_fn.prog.value < 0 || _fn.prog.value > 100) {
            _fn.prog.value = 0;
        }

        var deg = _fn.prog.value * 3.6;

        if (_fn.prog.value > 50) {
            _fn.fill.style.opacity = '1';
            _fn.mask.style.opacity = '0';
        } else {
            _fn.fill.style.opacity = '0';
            _fn.mask.style.opacity = '1';
        }

        _fn.spin.style.transform = 'rotate(' + deg + 'deg)';
    }

    _fn.prog.onchange = function() {
        fn.change();
    }

    fn.change();
})()