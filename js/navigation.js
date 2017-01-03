$(document).ready(function() {
    $("#aside-menu-button").click(function() {
        moveNavigationBar();
        console.log(document.activeElement);
    });

    $("#search-button").click(function() {
        console.log(screen.width);
        moveSearchBar();
        console.log(document.activeElement);
    });
});


function moveNavigationBar() {
    if ($('#navigation-bar').css('left') === '0px') {
        $('#navigation-bar').animate({
            left: '-30%'
        }, { duration: 300, queue: false }, null);
    } else {
        //다른 네비게이션 바가 열려있을 경우 닫아줌
        if ($('#search-bar').css('left') === screen.width / 2 + 'px') {
            $('#search-bar').animate({
                left: -screen.width
            }, { duration: 600, queue: false }, null);
        }
        $('#navigation-bar').animate({
            left: '0%'
        }, { duration: 300, queue: false }, null);
    }
}

function moveSearchBar() {
    if ($('#search-bar').css('left') === screen.width / 2 + 'px') {
        $('#search-bar').animate({
            left: -(screen.width / 2)
        }, { duration: 600, queue: false }, null);
    } else {
        //다른 네비게이션 바가 열려있을 경우 닫아줌
        if ($('#navigation-bar').css('left') === '0px') {
            $('#navigation-bar').animate({
                left: -screen.width
            }, { duration: 300, queue: false }, null);
        }
        $('#search-bar').animate({
            left: screen.width / 2
        }, { duration: 600, queue: false }, null);
    }
}