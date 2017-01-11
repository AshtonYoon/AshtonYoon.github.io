(function(window, document, $) {
    $(function() {
        main();
    });

    var permalink = new Array();

    // only used for the firstclick
    var isAfterFirstTrack = false;

    // audio data
    var audioCtx;
    if ('webkitAudioContext' in window) {
        audioCtx = new webkitAudioContext();
    } else {
        audioCtx = new window.AudioContext();
    }
    var buf;
    var sound;
    var gainNode;

    //visualizer
    var requestAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

    var $sound;
    var audioCtx;
    var source;
    var analyser;
    var frequencyData;

    var visualizer;
    var canvas;
    var ctx;
    var canvasWidth;
    var canvasHeight;

    var freqs = [60, 90, 130, 225, 320, 453, 640, 900, 1300, 1800, 2500, 3000, 4500, 6000, 8000, 10000, 12000, 14000, 15000, 16000];

    // interval
    var progressTimer;

    // id for songs
    var testId = 128843605;
    var CLIENT_ID = '8f474de4d1dedd5a6a4f4cbb60f4e6b8';

    // time
    var initialTimestamp = 0;
    var pausedTimestamp = 0;
    var pausedDuration = 0;
    var now = 0;
    var trackDuration = 0;

    // physical
    var trackBarWidth = null;
    var leftPositionOfContainer = null;

    // numerical
    var faderPosition = 0;

    // boolean
    var isStreaming = false;
    var isNeverPaused = true;
    var isplaybackTimeChanged = false;

    // 검색 결과들을 담아줄 곳
    var arrayOfSongsData = [];
    var visibleTrackFigure;
    var currentIndexOfTrackOnTheLeft = 0;
    var totalSongsFigure = 0;

    function main() {
        //SoundCloud API 접근 권한 부여
        SC.initialize({
            client_id: CLIENT_ID
        });

        $sound = document.getElementById('sound'),
            audioCtx = new AudioContext(),
            source = audioCtx.createMediaElementSource($sound),
            analyser = audioCtx.createAnalyser(),
            frequencyData = new Uint8Array(analyser.frequencyBinCount);

        $sound.crossOrigin = "anonymous";

        visualizer = document.getElementById('visualizer'),
            canvas = document.querySelector('#visualizer > canvas'),
            ctx = canvas.getContext('2d'),
            canvasWidth = canvas.width,
            canvasHeight = canvas.height;

        $('#search-bar').on('keypress', function(event) {
            if (event.keyCode === 13) {
                var query = $(this).val();
                setTrackPickerByQuery(query);
                console.log("entered!");
            }
        });
    }

    function setTrackPickerByQuery(aQuery) {
        var promise = getDataOfQuery(aQuery);
        promise.then(setTrackPickerManager);
    }

    function getDataOfQuery(aQuery) {
        var deferred = $.Deferred();
        SC.get('/tracks', { q: aQuery }, function(tracks) {
            console.log(tracks);

            // return
            return deferred.resolve(tracks);
        });
        return deferred.promise();
    }

    //검색 결과창의 기능 관리
    function setTrackPickerManager(aDataOfSongs) {
        console.log("executed setTrackPickerManager!");

        resetLinkData();

        makeListContentsEmpty();
        resetTrackData();

        console.log(aDataOfSongs);

        setPickerViewManager(arrayOfSongsData);

        setPickerDataManager(aDataOfSongs);
        var visibleFigure = getVisibleTrackFigure();
        var index = getCurrentIndexOfTrackOnTheLeft();
        var remainedTracksFromIndex = calcDisplayableNumber(index);
        if (remainedTracksFromIndex < visibleFigure) {
            visibleFigure = remainedTracksFromIndex;
        }

        //인자 : 개수, 음악 정보, 인덱스?
        displayTrackPicker(visibleFigure, arrayOfSongsData, index);
        setSelectingTrackEventListerner();
    }

    function resetLinkData(params) {
        permalink = [];
    }

    // track picker의 dom을 관리함
    function setPickerViewManager(aArrayOfSongs) {
        var windowSize = getWindowSize();
        var figureOfVisibleTracks = getDisplayingTracksFigure(windowSize);
        setVisibleTrackFigure(figureOfVisibleTracks);
        var pickerWidth = getModifiedPickerWidth(figureOfVisibleTracks);
        changeStyle($('#track-picker>ul'), 'width', pickerWidth);
    }

    function getWindowSize() {
        return $(window).width();
    }

    function getDisplayingTracksFigure(aWindowSize) {
        var eachElementWidth = 190;
        var figure = Math.floor((aWindowSize - 100) / eachElementWidth);
        return figure;
    }

    function setVisibleTrackFigure(aVisibleFigure) {
        visibleTrackFigure = aVisibleFigure;
    }

    function getVisibleTrackFigure() {
        return visibleTrackFigure;
    }

    function getModifiedPickerWidth(aFigure) {
        return 190 * aFigure;
    }

    function changeStyle(aDom, aProperty, aValue) {
        aDom.css(aProperty, aValue);
    }

    //검색된 음악들의 데이터를 넣어줌
    function setPickerDataManager(aDataOfSongs) {
        console.log("executed setPickerDataManager!");
        for (var i = 0; i < aDataOfSongs.length; i++) {
            //검색한 음악들의 정보를 추출해줌
            var trackData = extractInfo(aDataOfSongs[i]);
            permalink[i] = trackData.permalink_url;
            if ((trackData.artwork !== null) && (trackData.streamable === true)) {
                organizeStoringData(true, trackData);
            }
        }
    }

    //정보 추출
    function extractInfo(aTrackData) {
        var trackDataObj = {};
        trackDataObj.artwork = aTrackData.artwork_url;
        trackDataObj.title = aTrackData.title;
        trackDataObj.artistName = aTrackData.user.username;
        trackDataObj.id = aTrackData.id;
        trackDataObj.streamable = aTrackData.streamable;

        var convertedTrackDuration = convertMillisecondsToSeconds(aTrackData.duration);
        trackDataObj.duration = convertPlaybackTime(convertedTrackDuration);

        return trackDataObj;
    }

    //밀리세컨드 -> 세컨드
    function convertMillisecondsToSeconds(aMilliseconds) {
        var durationInSeconds = Math.floor(aMilliseconds / 1000);
        return durationInSeconds;
    }

    //재생시간 변환 ex) 180s -> 3m 0s
    function convertPlaybackTime(aPlaybackTime) {
        // duration | ex) playbackTime = 360.3452 |
        var minutes = Math.floor(aPlaybackTime / 60);
        var seconds = Math.floor(aPlaybackTime % 60);

        // add 0 for layout
        seconds = (seconds < 10) ? '0' + seconds : seconds;

        return minutes + ':' + seconds;
    }

    //데이터 저장하기
    function organizeStoringData(aIsLoadable, aTrackData) {
        if (aIsLoadable) {
            aTrackData.artwork = replaceArtworkUrl(aTrackData.artwork);
            addInfo(aTrackData);
            incrementTotalSongsFigure();
        }
    }

    // 기본이미지 크기 : 100x100 -> 바뀔 크기 : 300x300
    function replaceArtworkUrl(aUrl) {
        return aUrl.replace('large.jpg', 't300x300.jpg');
    }

    // 각각의 음악을 배열에 저장
    function addInfo(aTrackData) {
        if (aTrackData.artwork !== null) {
            arrayOfSongsData.push(aTrackData);
        }
    }

    //음악의 총 개수를 늘림
    function incrementTotalSongsFigure() {
        totalSongsFigure++;
    }

    function getVisibleTrackFigure() {
        return visibleTrackFigure;
    }

    // 초기값 : 0 | 슬라이더 애니메이션이 발생했을 때 값이 변함
    function getCurrentIndexOfTrackOnTheLeft() {
        return currentIndexOfTrackOnTheLeft;
    }

    function calcDisplayableNumber(aIndex) {
        return totalSongsFigure - aIndex;
    }

    //검색 후 나온 결과를 보여주는 창
    function displayTrackPicker(aNumber, aSongData, aIndex) {
        console.log("executed displayTrackPicker!");
        console.log(aIndex);
        console.log(aNumber);

        var length = aSongData.length;

        // 인덱스가 0이면 뒤로가기 버튼을 숨김
        if (aIndex === 0) {
            hideElement($('#left-arrow'));
        } else {
            displayArrow($('#left-arrow'));
        }

        if ((aNumber + aIndex) === length) {
            hideElement($('#right-arrow'));
        } else {
            displayArrow($('#right-arrow'));
        }
        var $trackPicker = $('#track-picker');
        $trackPicker.css({
            display: 'block',
        });
        var html = '';
        var elm = '<li></li>';

        html += '<li><img src="resources/close-button.png" alt="close" id="close-button" style="width: 5%; opacity: 1; left:100%;' +
            'transform: translateX(-100%); position:relative; padding:1%"></li>'

        for (var i = aIndex; i < (aIndex + aNumber); i++) {
            //test
            var imgElm = $('<img>');
            imgElm.attr('src', aSongData[i].artwork);

            var url = aSongData[i].artwork;
            var id = aSongData[i].id;
            var title = aSongData[i].title;
            var duration = aSongData[i].duration;
            var artistName = aSongData[i].artistName;
            html += '<li><figure><img src="' + url + '" id="' + id +
                '"><figcaption><span class="track-title">' + title + '</span><span class="track-duration">' + duration +
                '</span><span class="artist-name">' + artistName + '</span></figcaption></figure></li>';
        }

        // ul 위치 초기화
        var pickerUl = $trackPicker.find('ul');
        pickerUl.css({
            left: 0,
            width: '100%'
        });
        // 로딩이 끝난 후 이미지 페이드 인
        $(html).appendTo(pickerUl)
            .find('img')
            .css({ opacity: 0 })
            .on('load', function() {
                $(this).animate({ opacity: 1 }, 400);
            });

        //요소가 보여진 후에 이벤트 등록 
        $('#close-button').on('click', function() {
            console.log("closed");
            //메서드 2개 혹시 모르니까 잘못되면 resetTrackPickerView()로 바꿔주기
            makeListContentsEmpty();
            resetTrackData();
        });
    }

    //요소 숨기기
    function hideElement(aDom) {
        aDom.css({
            display: 'none'
        });
    }

    //요소 보여주기
    function displayArrow(aDom) {
        aDom.css({
            display: 'block'
        });
    }

    function setSelectingTrackEventListerner() {
        $('#track-picker>ul>li>figure').on('click', function() {
            setPlayer($(this));
        });
    }

    function setPlayer(aTarget) {
        var target = aTarget.find('img');
        var trackId = getElementId(target);
        var streamUrl = getStreamUrl(trackId);
        var targetSrc = getElementSrc(target);

        var titleDom = aTarget.find('figcaption>span.track-title');
        var artistNameDom = aTarget.find('figcaption>span.artist-name');
        // trackPicker숨기기
        resetTrackPickerView();

        // 500x500 커버이미지
        var mainVisualUrl = getMainVisualUrl(targetSrc);

        // var averageColor = new ColorThief();
        // console.log(averageColor.getColor(document.getElementById('virtualImg')));

        // $('#track-bar').css('background-color', 'rgb(' + averageColor.getColor(document.getElementById('virtualImg'))[0] +
        //     ', ' + averageColor.getColor(document.getElementById('virtualImg'))[1] +
        //     ', ' + averageColor.getColor(document.getElementById('virtualImg'))[2] + ')');

        // attr(src)을 css(content)형태로 변환시켜줌
        mainVisualUrl = convertAttrToCss(mainVisualUrl);
        var trackTitle = getElementText(titleDom);
        var artistName = getElementText(artistNameDom);

        $('#background-image').css('content', mainVisualUrl);
        $('#main-visual').css('content', mainVisualUrl);

        $('#title').html(trackTitle);
        $('#artist').html(artistName);

        addMask();

        setSrc(streamUrl);
        document.getElementById('sound').load();

        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        start();

        // 비동기 메서드
        var promise = getAudio(streamUrl);
        // 오디오 얻고 초기화시켜주기
        promise.then(init);
    }

    function getElementId(aTarget) {
        return aTarget.attr('id');
    }

    function getElementText(aTarget) {
        return aTarget.text();
    }

    function getStreamUrl(aId) {
        return 'https://api.soundcloud.com/tracks/' + aId + '/stream?client_id=' + CLIENT_ID;
    }

    function getElementSrc(aTarget) {
        return aTarget.attr('src');
    }

    // picker 숨기기
    function resetTrackPickerView() {
        var $trackPicker = $('#track-picker');
        $trackPicker.animate({
            opacity: 0
        }, 300, function() {
            $trackPicker.css({
                display: 'none',
                opacity: 1
            });
        });

        makeListContentsEmpty();
    }

    function makeListContentsEmpty() {
        $('#track-picker').find('ul').empty();
    }

    function getMainVisualUrl(aSrc) {
        return aSrc.replace('t300x300.jpg', 't500x500.jpg');
    }

    function convertAttrToCss(aUrl) {
        return 'url(' + aUrl + ')';
    }

    function getAudio(aUrl) {
        var deferred = $.Deferred();
        // ajax is not capable of "array buffer"
        var xhr = new XMLHttpRequest();
        xhr.open('GET', aUrl, true);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200 && (xhr.status !== 404)) {
                audioCtx.decodeAudioData(xhr.response, function(buffer) {
                    buf = buffer;
                    return deferred.resolve(true);
                });
            }
        };
        xhr.onerror = function() {
            return deferred.resolve(false);
        };
        xhr.send();
        return deferred.promise();
    }

    function start() {
        analyser.getByteFrequencyData(frequencyData);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        for (var i = 0; i < freqs.length; i++) {
            ctx.beginPath();
            ctx.moveTo(i * (canvasWidth * 8) / 200, 300);
            ctx.lineTo(i * (canvasWidth * 8) / 200, 300 - freq(freqs[i]));
            ctx.lineWidth = (canvasWidth * 8) / 200;
            ctx.strokeStyle = "#fff";
            ctx.stroke();
        }
        //draw at constant cycle
        requestAnimFrame(start);
    }

    function freq(frequency) {
        //get Hz
        var nyquistFreq = audioCtx.sampleRate / 2;
        var visualFreq = Math.round(frequency / nyquistFreq * frequencyData.length);

        return frequencyData[visualFreq] - 75;
    }

    function setSrc(streamUrl) {
        $sound.src = streamUrl;
    };

    function init(isAudioDataReady) {
        // request의 성공 여부를 확인함
        if (!isAudioDataReady) {
            if (isAfterFirstTrack) {
                resetTrackData();
            }
            removeMask();
            resetMainVisual();
            showAlert();
            return;
        } else {
            if (isAfterFirstTrack) {
                resetAudioData();
                resetTrackData();
                resetAudioEventListers();
            } else {
                changeUserState(); // <- isAfterFirstTrack = true
                resetTrackData();
            }

            setAudio();
            setAudioDuration();

            setGain();
            connectGain();
            connectAudio();

            setAudioEventListeners();

            setTrackDuration();
            removeMask();
        }
    }

    function resetTrackData() {
        arrayOfSongsData = [];
        currentIndexOfTrackOnTheLeft = 0;
        totalSongsFigure = 0;
    }

    function resetMainVisual() {
        var imgSrc = getMainVisualImgSrc();
        var trackTitle = getLastTitle();
        var artistName = getLastArtistName();
    }

    function getMainVisualImgSrc() {
        return lastMainVisualSrc;
    }

    function getLastTitle() {
        return lastTitle;
    }

    function getLastArtistName() {
        return lastArtistName;
    }

    function showAlert() {
        var msg = $('<div></div>');
        msg.html('Not streamable. Try another song.');
        msg.addClass('alert');
        msg.appendTo('body')
            .hide()
            .fadeIn(400)
            .fadeOut(700, function() {
                $(this).remove();
            });
    }

    function resetAudioData() {
        resetData();
        clearInterval(progressTimer);
        disconnectAudio();
        setStreamingState(false);
        setModifiedPlaybackTimeStatus(false);
    }

    function resetData() {
        setInitialPauseState(true);
        pausedDuration = 0;
    }

    function resetAudioEventListers() {
        $('#play-button').off('click');
        $('#track-bar-container').off('click');
        $('#volume-container>input').off('click');
    }

    function changeUserState() {
        isAfterFirstTrack = true;
    }

    function setAudio() {
        sound = audioCtx.createBufferSource();
        sound.buffer = buf;
    }

    function setAudioDuration() {
        trackDuration = sound.buffer.duration;
    }

    function setGain() {
        gainNode = audioCtx.createGain();
    }

    function connectGain() {
        sound.connect(gainNode);
    }

    function connectAudio() {
        gainNode.connect(audioCtx.destination);
    }

    function setAudioEventListeners() {
        console.log('set click event');
        $('#play-button').on('click', function() {
            setStreamController();
        });
        $('#track-bar-container').on('click', function(event) {
            faderMoveByClick(event);
        });
        $('#track-bar-container').on('mousedown', '#fader', function(event) {
            setFaderDrag(event);
        });
    }

    function setTrackDuration() {
        var html = convertPlaybackTime(trackDuration);
        displayPlaybackTime($('#song-duration'), html);
    }

    function displayPlaybackTime(aDom, aPlaybackTimeHtml) {
        aDom.html(aPlaybackTimeHtml);
    }

    // controll stream methods
    function setStreamController() {
        // get boolean
        var streamingStatus = getStreamingStatus();

        function getStreamingStatus() {
            return isStreaming;
        }

        if (streamingStatus) {
            setPause();
        } else {
            setStream();
        }
    }

    function setPause() {
        pause();
        pausedTimestamp = getCurrentTime();
        setStreamingState(false);
        setInitialPauseState(false);
        clearInterval(progressTimer);

        // stop-button >> play-button
        swapBtn();
    }

    // pause
    function pause() {
        sound.stop(0);
    }

    function getCursorPos(event) {
        var cursorX = event.pageX;
        return cursorX - leftPositionOfContainer;
    }

    function convertLengthToTime(aLength) {
        return trackDuration * (aLength / trackBarWidth);
    }

    function getCurrentTime() {
        return audioCtx.currentTime;
    }

    function setStreamingState(aCondition) {
        isStreaming = aCondition;
    }

    function setInitialPauseState(aCondition) {
        isNeverPaused = aCondition;
    }

    // pause or play icon
    function swapBtn() {
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
    }

    function setStream() {
        var pausedStatus = getPausedStatus();

        // if never paused
        if (pausedStatus) {
            initialTimestamp = getCurrentTime();

            now = initialTimestamp;
            // if user changed playbacktime..
            if (isplaybackTimeChanged) {
                faderPosition = getFaderPosition();
            }
            // if not, calculate the stop time & create audio src again
        } else {
            var clickedTime = getCurrentTime();
            now = clickedTime;
            pausedDuration += (clickedTime - pausedTimestamp);
            disconnectAudio();
            setAudio();
            connectGain();
        }

        var playbackTime = calcPlaybackTime(faderPosition);
        stream(playbackTime);

        // progress bar interval
        startInterval(playbackTime);

        setStreamingState(true);

        // view >> play-btn
        swapBtn();
    }

    function getPausedStatus() {
        return isNeverPaused;
    }

    function disconnectAudio() {
        sound.disconnect(0);
    }

    // play
    function stream(aPlaybackTime) {
        sound.start(0, aPlaybackTime);
    }

    function startInterval(aPlaybackTime) {
        var $fader = $('#fader');
        var $progressBar = $('#progress-bar');
        var $playback = $('#playback-time');

        progressTimer = setInterval(function() {
            var length = convertTimeToLength(aPlaybackTime);

            // view >> progress bar
            changeStyle($fader, 'left', length);
            changeStyle($progressBar, 'width', length);

            // view >> playback time
            var playbackTimeHtml = convertPlaybackTime(aPlaybackTime);
            displayPlaybackTime($playback, playbackTimeHtml);

            // interval time
            aPlaybackTime += 0.03;

            if (aPlaybackTime >= trackDuration) {
                resetInterval();
            }
        }, 30);
    }

    function convertTimeToLength(aPlaybackTime) {
        return aPlaybackTime / trackDuration * trackBarWidth;
    }

    function resetInterval() {
        clearInterval(progressTimer);
        resetData();
        setStreamingState(false);
        swapBtn();
        // possible to start the song again
        disconnectAudio();
        setAudio();
        connectGain();
        // start at 0
        setModifiedPlaybackTimeStatus(false);
        resetFaderPosition();
    }

    function setModifiedPlaybackTimeStatus(aCondition) {
        isplaybackTimeChanged = aCondition;
    }

    function getTrackBarWidth() {
        return $('#track-bar').width();
    }

    // loading finishes
    function removeMask() {
        $('.spinner').fadeOut(500, function() {
            $(this).remove();
        });
    }

    // loading
    function addMask() {
        var mask = $('<div></div>');
        mask.addClass('spinner');
        $('body').append(mask).hide().fadeIn(300);
    }

    //fader
    function faderMoveByClick(event) {
        // change positions of fader, progressbar
        var cursorX = getCursorPos(event);
        if (cursorX < 0) {
            cursorX = 0;
        }
        changeStyle($('#fader'), 'left', cursorX);
        changeStyle($('#progress-bar'), 'width', cursorX);

        setModifiedPlaybackTimeStatus(true);
        // display possible playback time
        var playbackTime = calcPlaybackTime(cursorX);
        // playbacktime in seconds & minutes
        playbackTime = convertPlaybackTime(playbackTime);
        displayPlaybackTime($('#playback-time'), playbackTime);

        resetData();
        // prepare audio buffer again
        disconnectAudio();
        setAudio();
        connectGain();

        // play it immediately
        if (isStreaming) {
            clearInterval(progressTimer);
            setStream();
        }
    }

    function calcPlaybackTime(aFaderPosition) {
        return (aFaderPosition / getTrackBarWidth()) * trackDuration + (now - initialTimestamp - pausedDuration);
    }

    function setFaderDrag(event) {
        if (isStreaming) {
            pause();
        }
        resetData();
        clearInterval(progressTimer);
        var $jukeBox = $('#juke-box');

        $jukeBox.on('mousemove', setFaderMoveController);
        $jukeBox.on('mouseleave mouseup', detachFaderMoveController);
    }

    function setFaderMoveController(event) {
        var faderPosX = getCursorPos(event);
        var barWidth = getTrackBarWidth();
        if (faderPosX < 0) {
            faderPosX = 0;
        }
        if (barWidth < faderPosX) {
            faderPosX = barWidth;
        }

        // view >> fader, progress-bar
        changeStyle($('#fader'), 'left', faderPosX);
        changeStyle($('#progress-bar'), 'width', faderPosX);

        // view >> playback time
        var playbackTime = convertLengthToTime(faderPosX);
        var htmlOfTime = convertPlaybackTime(playbackTime);
        displayPlaybackTime($('#playback-time'), htmlOfTime);
    }

    function detachFaderMoveController() {
        // prevent events from being called multiple times
        var $jukeBox = $('#juke-box');
        $jukeBox.off('mousemove', setFaderMoveController);
        $jukeBox.off('mouseleave mouseup');

        // if cursor outside container
        var isCursorInsideContainer = checkCursor(event);
        if (!isCursorInsideContainer) {
            faderMoveByClick(event);
        }
    }

    function checkCursor(event) {
        // absolute positions of cursor
        var posX = event.pageX;
        var posY = event.pageY;

        /* 
        container info：calc values of width height top left,
        judge whether cursor is outside or inside
        */
        var $target = $('#track-bar-container');
        var targetTop = $target.offset().top;
        var targetLeft = $target.offset().left;
        var targetWidth = trackBarWidth;
        var targetHeight = $target.outerHeight();

        if ((targetLeft <= posX) &&
            (posX <= (targetLeft + targetWidth)) &&
            (targetTop <= posY) &&
            (posY <= (targetTop + targetHeight))) {
            return true;
        } else {
            return false;
        }
    }

    function getFaderPosition() {
        // get relative position to #track-bar
        return $('#fader').position().left;
    }

    function resetFaderPosition() {
        faderPosition = 0;
    }
})(window, document, window.jQuery);