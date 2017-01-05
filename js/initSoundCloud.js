(function(window, document, $) {
    $(function() {
        main();
        setViewEventListeners();
    });

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
        console.log("success");
        $('#search-bar').on('keypress', function(event) {
            if (event.keyCode === 13) {
                var query = $(this).val();
                setTrackPickerByQuery(query);
                console.log("entered!");
            }
        });
    }

    function setViewEventListeners() {

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

        makeListContentsEmpty();
        resetTrackPickerView();

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
        //setSelectingTrackEventListerner();
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
        // hide
        resetTrackPickerView();

        // loading starts
        addMask();

        // main visual
        var mainVisualUrl = getMainVisualUrl(targetSrc);
        // convert attr to css format
        mainVisualUrl = convertAttrToCss(mainVisualUrl);
        var trackTitle = getElementText(titleDom);
        var artistName = getElementText(artistNameDom);

        // asynchronous method
        var promise = getAudio(streamUrl);
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

    // loading
    function addMask() {
        var mask = $('<div></div>');
        mask.addClass('load-mask');
        $('body').append(mask).hide().fadeIn(300);
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

    function init(isAudioDataReady) {
        // check whether or not the request successed
        if (!isAudioDataReady) {
            if (isAfterFirstTrack) {
                resetTrackData();
            }
            removeMask();
            // reset main visual
            resetMainVisual();
            showAlert();
            return;
        } else {
            // start init
            if (isAfterFirstTrack) {
                resetAudioData();
                resetTrackData();
                //resetAudioEventListers();
            } else {
                changeUserState();
                resetTrackData();
            }

            setAudio();
            setAudioDuration();

            setGain();
            connectGain();
            connectAudio();

            setAudioEventListeners();

            setTrackDuration();

            // tell initial setting done
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
        resetFaderPosition();
        clearInterval(progressTimer);
        disconnectAudio();
        setStreamingState(false);
        setModifiedPlaybackTimeStatus(false);
    }

    function resetData() {
        setInitialPauseState(true);
        pausedDuration = 0;
    }

    function resetFaderPosition() {
        faderPosition = 0;
    }

    function resetAudioEventListers() {
        $('#play-btn').off('click');
        $('#track-bar-container').off('click');
        $('#track-bar-container').off('mousedown', '#fader');
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
        $('#play-button').on('click', function() {
            setStreamController();
        });
    }

    function setTrackDuration() {
        var html = convertPlaybackTime(trackDuration);
        displayPlaybackTime($('#song-duration'), html);
    }

    function displayPlaybackTime(aDom, aPlaybackTimeHtml) {
        aDom.html(aPlaybackTimeHtml);
    }

    // loading finishes
    function removeMask() {
        $('.load-mask').fadeOut(500, function() {
            $(this).remove();
        });
    }
})(window, document, window.jQuery);