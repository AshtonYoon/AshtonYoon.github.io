$(document).ready(function() {
    $('#play-button').click(function() {
        if ($('#play-button').attr('class') == 'play') {
            $('#play-button').removeClass('play');
            $('#play-button').addClass('stop');

            //animate image
            $('#play-button').animate({
                opacity: 0
            }, 150, function() {
                $('#play-button').attr('src', 'resources/stop-button.png');
                $('#play-button').animate({ opacity: 1 }, 300, null);
            });
        } else if ($('#play-button').attr('class') == 'stop') {
            $('#play-button').removeClass('stop');
            $('#play-button').addClass('play');

            //animate image
            $('#play-button').animate({
                opacity: 0
            }, 150, function() {
                $('#play-button').attr('src', 'resources/play-button.png');
                $('#play-button').animate({ opacity: 1 }, 300, null);
            });
        }
    });
});