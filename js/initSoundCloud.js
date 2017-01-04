(function(window, document, $) {
    $(function() {
        main();
        setViewEventListeners();
    });

    // id for songs
    var testId = 128843605;
    var CLIENT_ID = '8f474de4d1dedd5a6a4f4cbb60f4e6b8';

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
            left: 0
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
})(window, document, window.jQuery);