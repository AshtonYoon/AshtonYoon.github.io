/*

Copyright (c) 2014 Yuma Yanagisawa

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;
(function(window, document, $) {
    ///////////
    // data //
    /////////

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

    // time
    var initialTimestamp = 0;
    var pausedTimestamp = 0;
    var pausedDuration = 0;
    var now = 0;
    var trackDuration = 0;

    // physical
    var trackBarWidth = null;
    var leftPositionOfContainer = null;

    // id for songs
    var testId = 128843605;
    var CLIENT_ID = '8f474de4d1dedd5a6a4f4cbb60f4e6b8';


    $(function() {
        main();
    });

    ///////////
    // main //
    /////////
    function main() {
        //SoundCloud API 접근 권한 부여
        SC.initialize({
            client_id: CLIENT_ID
        });
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
                swapBtn();
                resetAudioEventListers();
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


    /////////////---------------------------------------------------------
    /// CONTROLLER
    ///////////-----------------------------------------------------------


    //--------------------------------------------------------------------
    // controll transition related methods
    //--------------------------------------------------------------------

    function setViewEventListeners() {
        $('#genre-btn').on('click', function() {
            swapGenreContainerView('visible');

            setGenrePicker();
        });

        $('#left-arrow').on('click', function() {
            setSlideAnimationManager('backward');
        });

        $('#right-arrow').on('click', function() {
            setSlideAnimationManager('forward');
        });

        $('#genre-container>svg.close-btn').on('click', function() {
            detachSetGenrePickerEventListener();
            swapGenreContainerView('hidden');
        });

        $('#track-picker>svg.close-btn').on('click', function() {
            detachSelectingTrackEevntLister();
            resetTrackPickerView();
            resetTrackData();
        });

        $('#track-picker>p').on('click', function() {
            detachSetGenrePickerEventListener();
            resetTrackPickerView();
            swapGenreContainerView('visible');
            resetTrackData();
            setGenrePicker();
        });

        $('#search-box').on('keypress', function(event) {
            if (event.keyCode === 13) {
                var query = $(this).val();
                setTrackPickerByQuery(query);
            }
        });

    }

    function setGenrePicker() {
        $('#genre').on('click', 'li', function() {
            var target = $(this);
            setTrackPickerByGenre(target);
            $('#genre').off('click', 'li');
        });
    }

    function detachSetGenrePickerEventListener() {
        $('#genre').off('click', 'li');
    }

    function setSelectingTrackEventListerner() {
        $('#track-picker>ul>li>figure').on('click', function() {
            setPlayer($(this));
        });
    }

    function detachSelectingTrackEevntLister() {
        $('#track-picker>ul>li>figure').off('click');
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


        setMainVisualDataManager();

        // main visual
        var mainVisualUrl = getMainVisualUrl(targetSrc);
        // convert attr to css format
        mainVisualUrl = convertAttrToCss(mainVisualUrl);
        var trackTitle = getElementText(titleDom);
        var artistName = getElementText(artistNameDom);

        changeMainVisual(mainVisualUrl, trackTitle, artistName);


        // artist name
        changeTitieOnProgressBar();
        // asynchronous method
        var promise = getAudio(streamUrl);
        promise
            .then(init);
    }

    function setMainVisualDataManager() {
        // store img src of main visual to show it again when the xhr fails
        var lastMainVisualImgSrc = getElementBackground($('#main-visual'));
        console.log(lastMainVisualImgSrc);
        // and set
        setMainVisualImgSrc(lastMainVisualImgSrc);

        var lastTitle = getElementText($('#juke-box>ul>li:first-child'));
        setLastTitle(lastTitle);

        var lastArtistName = getElementText($('#juke-box>ul>li:last-child'));
        setLastArtistName(lastArtistName);
    }

    function setTrackPickerByGenre(aTarget) {
        var targetGenre = getElementText(aTarget);
        swapGenreContainerView('hidden');
        var promise = getDataOfSelectedGenre(targetGenre);
        promise
            .then(setTrackPickerManager);
    }

    function setTrackPickerByQuery(aQuery) {
        var promise = getDataOfQuery(aQuery);
        promise.then(setTrackPickerManager);
    }

    // manage whole functions of picker
    function setTrackPickerManager(aDataOfSongs) {
        console.log(aDataOfSongs);
        setPickerViewManager(arrayOfSongsData);

        setPickerDataManager(aDataOfSongs);
        var visibleFigure = getVisibleTrackFigure();
        var index = getCurrentIndexOfTrackOnTheLeft();
        var remainedTracksFromIndex = calcDisplayableNumber(index);
        if (remainedTracksFromIndex < visibleFigure) {
            visibleFigure = remainedTracksFromIndex;
        }

        //인자 : number, songdata, index
        displayTrackPicker(visibleFigure, arrayOfSongsData, index);
        setSelectingTrackEventListerner();
    }

    function setPickerDataManager(aDataOfSongs) {
        for (var i = 0; i < aDataOfSongs.length; i++) {
            //검색한 음악들의 정보를 추출해줌
            var trackData = extractInfo(aDataOfSongs[i]);
            if (
                (trackData.artwork !== null) &&
                (trackData.streamable === true)
            ) {
                organizeStoringData(true, trackData);
            }
        }
    }


    function organizeStoringData(aIsLoadable, aTrackData) {
        if (aIsLoadable) {
            aTrackData.artwork = replaceArtworkUrl(aTrackData.artwork);
            addInfo(aTrackData);
            incrementTotalSongsFigure();
        }
    }

    // dom of track picker
    function setPickerViewManager(aArrayOfSongs) {
        var windowSize = getWindowSize();
        var figureOfVisibleTracks = getDisplayingTracksFigure(windowSize);
        setVisibleTrackFigure(figureOfVisibleTracks);
        var pickerWidth = getModifiedPickerWidth(figureOfVisibleTracks);
        changeStyle($('#track-picker>ul'), 'width', pickerWidth);
    }

    // manage slide animation
    function setSlideAnimationManager(aDirection) {
        var promise = slidePicker(aDirection, false);
        promise
            .then(organizePickerListContents);
    }

    // manage DOM of picker
    function organizePickerListContents(aDirection) {
        // reset array
        makeListContentsEmpty();

        // decide which songs to be displayed
        var currentIndex = getCurrentIndexOfTrackOnTheLeft();
        var numOfTracksOnScreen = getVisibleTrackFigure();
        var newIndex = calcCurrentIndexOfTrackOnTheLeft(currentIndex, numOfTracksOnScreen, aDirection);
        setCurrentIndexOfTrackOnTheLeft(newIndex);

        var index = getCurrentIndexOfTrackOnTheLeft();
        console.log(index);
        var remainedTracksFromIndex = calcDisplayableNumber(index);
        if (remainedTracksFromIndex < numOfTracksOnScreen) {
            numOfTracksOnScreen = remainedTracksFromIndex;
        }

        // display it again
        displayTrackPicker(numOfTracksOnScreen, arrayOfSongsData, newIndex);

        // animation
        changePickerPositionX(aDirection);
        slidePicker(aDirection, true);

        //set eventlisterners
        setSelectingTrackEventListerner();

    }

    function resetMainVisual() {
        var imgSrc = getMainVisualImgSrc();
        var trackTitle = getLastTitle();
        var artistName = getLastArtistName();

        changeMainVisual(imgSrc, trackTitle, artistName);

    }

    //-------------------------------------------------------------
    // controll audio related methods
    //-------------------------------------------------------------

    function setAudioEventListeners() {

        $('#play-btn').on('click', function() {
            setStreamController();
        });

        $('#track-bar-container').on('click', function(event) {
            faderMoveByClick(event);
        });

        $('#track-bar-container').on('mousedown', '#fader', function(event) {
            setFaderDrag(event);
        });

        $('#volume-container>input').on('click', function(event) {
            var volume = getVolume(event);
            changeVolume(volume);
        });

    }

    function resetAudioEventListers() {
        $('#play-btn').off('click');
        $('#track-bar-container').off('click');
        $('#track-bar-container').off('mousedown', '#fader');
        $('#volume-container>input').off('click');
    }

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

    function setVolumeFaderDrag(event) {
        var $volumeContainer = $('#volume-container');
        $volumeContainer.on('mousemove', setVolumeController);

        $volumeContainer.on('mousemove mouseup', detachVolumeController);
    }

    function setVolumeController(event) {
        var faderPosY = getCursorPos;
    }

    function detachVolumeController() {

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

        if (
            (targetLeft <= posX) &&
            (posX <= (targetLeft + targetWidth)) &&
            (targetTop <= posY) &&
            (posY <= (targetTop + targetHeight))
        )

        {
            return true;
        } else {
            return false;
        }
    }

    // get volume from scale input
    function getVolume(event) {
        console.log(event);
        console.log(event.offsetX);
        var volume = event.offsetX / 100;
        return volume;
    }

    function changeVolume(aVolume) {
        console.log(gainNode);
        gainNode.gain.value = aVolume;
    }

    function setTrackDuration() {
        var html = convertPlaybackTime(trackDuration);
        displayPlaybackTime($('#song-duration'), html);
    }

    // controll stream methods
    function setStreamController() {
        // get boolean
        var streamingStatus = getStreamingStatus();

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

        // view >> play-btn
        swapBtn();
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

    // play
    function stream(aPlaybackTime) {
        sound.start(0, aPlaybackTime);
    }

    // pause
    function pause() {
        sound.stop(0);
    }


    /////////////---------------------------------------------------------
    /// VIEW
    ///////////-----------------------------------------------------------


    // view Nav
    function swapGenreContainerView(aValue) {
        var classes = ['visible', 'hidden'];
        if (aValue === 'hidden') {
            classes.reverse();
        }

        $('#genre-container').addClass(classes[0]);
        $('#genre-container').removeClass(classes[1]);
    }

    //검색 후 나온 결과를 보여주는 창
    function displayTrackPicker(aNumber, aSongData, aIndex) {
        console.log(aIndex);
        console.log(aNumber);

        var length = aSongData.length;

        // if index is 0, hide backward button
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

        // reset ul position
        var pickerUl = $trackPicker.find('ul');
        pickerUl
            .css({
                left: 0
            });

        // fadeIn img after loading finished
        $(html)
            .appendTo(pickerUl)
            .find('img')
            .css({ opacity: 0 })
            .load(function() {
                $(this)
                    .animate({ opacity: 1 }, 400);
            });

    }

    function hideElement(aDom) {
        aDom.css({
            display: 'none'
        });
    }

    function displayArrow(aDom) {
        aDom.css({
            display: 'block'
        });
    }

    function testLoad(aElm) {
        var deferred = $.Deferred();
        aElm.error(function() {

        });
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

    function slidePicker(aDirection, isLeftZero) {
        var deferred = $.Deferred();

        var windowSiz = $(window).width();
        var scrollValue = (aDirection === 'backward') ? windowSiz : -windowSiz;

        var currentLeftPosition = getPickerPositionX();
        if (isLeftZero) {
            currentLeftPosition = 0;
            scrollValue = 0;
        }
        $('#track-picker>ul').animate({
            left: (currentLeftPosition + scrollValue) + 'px'
                //transform: translateX(scrollValue + 'px')
        }, 300, function() {
            return deferred.resolve(aDirection);
        });

        return deferred.promise();
    }

    function changePickerPositionX(aDirection) {
        var windowSiz = $(window).width();
        var posX = (aDirection === 'forward') ? windowSiz : -windowSiz;
        $('#track-picker>ul').css({
            left: posX + 'px'
        });

    }

    // hide picker
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

    function changeMainVisual(aUrl, aTrackTitle, aArtistName) {
        $('#main-visual').css({
            background: aUrl + ' center center no-repeat',
            backgroundSize: 'cover',
            width: '50vh',
            height: '50vh'
        });

        $('#juke-box>ul>li:first-child').html(aTrackTitle);

        $('#juke-box>ul>li:last-child').html(aArtistName);
    }

    function convertAttrToCss(aUrl) {
        return 'url(' + aUrl + ')';
    }

    function changeTitieOnProgressBar() {

    }
    // loading finishes
    function removeMask() {
        $('.load-mask').fadeOut(500, function() {
            $(this).remove();
        });
    }

    // loading
    function addMask() {
        var mask = $('<div></div>');
        mask.addClass('load-mask');
        $('body').append(mask).hide().fadeIn(300);
    }

    // close nav by clicking on close-button
    function closeNav() {
        swapGenreContainerView('hidden');
    }

    /*
        view of progress bar & music player
    */
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

    function displayPlaybackTime(aDom, aPlaybackTimeHtml) {
        aDom.html(aPlaybackTimeHtml);
    }


    function changeStyle(aDom, aProperty, aValue) {
        aDom.css(aProperty, aValue);
    }

    function changeHtml(aDom, aValue) {
        aDom.html(aValue);
    }

    // pause or play icon
    function swapBtn() {
        var image = (isStreaming) ? 'pause' : 'play';
        $('#play-btn').css({
            background: 'url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/164143/' + image + '.png) 5px 5px no-repeat',
            backgroundSize: '30px 30px'
        });
    }

    /////////////---------------------------------------------------------
    /// MODEL
    ///////////-----------------------------------------------------------

    // nav
    var arrayOfSongsData = [];
    var visibleTrackFigure;
    var currentIndexOfTrackOnTheLeft = 0;
    var totalSongsFigure = 0;

    // main visual manager
    var lastMainVisualSrc;
    var lastTitle = '';
    var lastArtistName = '';

    function getArrSongsLength() {
        return arrayOfSongsData.length();
    }

    function changeUserState() {
        isAfterFirstTrack = true;
    }

    function getElementId(aTarget) {
        return aTarget.attr('id');
    }

    function getElementText(aTarget) {
        return aTarget.text();
    }

    function getDataOfSelectedGenre(aGenre) {
        var deferred = $.Deferred();
        SC.get('/tracks', { genres: aGenre }, function(tracks) {
            console.log(tracks);

            // return
            return deferred.resolve(tracks);
        });
        return deferred.promise();
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

    // make trackdata object
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

    // store each track data to an array
    function addInfo(aTrackData) {
        if (aTrackData.artwork !== null) {
            arrayOfSongsData.push(aTrackData);
        }
    }

    function incrementTotalSongsFigure() {
        totalSongsFigure++;
    }

    // for animation
    function getPickerPositionX() {
        return $('#track-picker>ul').offset().left;
    }

    // for function underneath
    function getWindowSize() {
        return $(window).width();
    }

    // calc how many artworks are displayed
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

    // milliseconds to seconds
    function convertMillisecondsToSeconds(aMilliseconds) {
        var durationInSeconds = Math.floor(aMilliseconds / 1000);
        return durationInSeconds;
    }

    function getModifiedPickerWidth(aFigure) {
        return 190 * aFigure;
    }

    // default:100x100px >> change path to get a bigger one:300x300px
    function replaceArtworkUrl(aUrl) {
        return aUrl.replace('large.jpg', 't300x300.jpg');
    }

    function getStreamUrl(aId) {
        return 'https://api.soundcloud.com/tracks/' + aId + '/stream?client_id=' + CLIENT_ID;
    }

    function getElementSrc(aTarget) {
        return aTarget.attr('src');
    }

    function getElementBackground(aTarget) {
        var bg = aTarget.css('backgroundImage');
        bg.replace(/.*\s?url\([\'\"]?/, '').replace(/[\'\"]?\).*/, '');
        console.log(bg);
        return bg;
    }

    function setMainVisualImgSrc(aLastMainVisualSrc) {
        lastMainVisualSrc = aLastMainVisualSrc;
    }

    function getMainVisualImgSrc() {
        return lastMainVisualSrc;
    }

    function getMainVisualUrl(aSrc) {
        return aSrc.replace('t300x300.jpg', 't500x500.jpg');
    }

    // initially 0 | the value fluctuates when slider animation is triggered
    function getCurrentIndexOfTrackOnTheLeft() {
        return currentIndexOfTrackOnTheLeft;
    }

    function setCurrentIndexOfTrackOnTheLeft(aValue) {
        currentIndexOfTrackOnTheLeft = aValue;
    }

    function calcCurrentIndexOfTrackOnTheLeft(aCurrentIndex, aSumOnScreen, aDirection) {
        var value = (aDirection === 'forward') ? aSumOnScreen : (-1 * aSumOnScreen);
        return aCurrentIndex + value;
    }

    function resetTrackData() {
        // fastest solution
        arrayOfSongsData = [];
        currentIndexOfTrackOnTheLeft = 0;
        totalSongsFigure = 0;
    }

    function calcDisplayableNumber(aIndex) {
        return totalSongsFigure - aIndex;
    }

    function setLastTitle(aLastTitle) {
        lastTitle = aLastTitle;
    }

    function getLastTitle() {
        return lastTitle;
    }

    function setLastArtistName(aLastArtistName) {
        lastArtistName = aLastArtistName;
    }

    function getLastArtistName() {
        return lastArtistName;
    }

    //-----------------------------------------------------------------------
    // data model member variables
    //-----------------------------------------------------------------------

    // boolean
    var isStreaming = false;
    var isNeverPaused = true;
    var isplaybackTimeChanged = false;

    // only used for the firstclick
    var isAfterFirstTrack = false;

    // numerical
    var faderPosition = 0;


    function getTrackBarWidth() {
        return $('#track-bar').width();
    }

    function getLeftPositionOfContainer() {
        return $('#track-bar-container').offset().left;
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

    function disconnectAudio() {
        sound.disconnect(0);
    }

    function getCurrentTime() {
        return audioCtx.currentTime;
    }

    function getFaderPosition() {
        // get relative position to #track-bar
        return $('#fader').position().left;
    }

    // calc playback time with initial fader position and progress time
    function calcPlaybackTime(aFaderPosition) {
        return (aFaderPosition / trackBarWidth) * trackDuration + (now - initialTimestamp - pausedDuration);
    }

    function getCursorPos(event) {
        var cursorX = event.pageX;
        return cursorX - leftPositionOfContainer;
    }


    function resetData() {
        setInitialPauseState(true);
        pausedDuration = 0;
    }

    function convertPlaybackTime(aPlaybackTime) {
        // duration | ex) playbackTime = 360.3452 |
        var minutes = Math.floor(aPlaybackTime / 60);
        var seconds = Math.floor(aPlaybackTime % 60);

        // add 0 for layout
        seconds = (seconds < 10) ? '0' + seconds : seconds;

        return minutes + ':' + seconds;
    }

    function convertLengthToTime(aLength) {
        return trackDuration * (aLength / trackBarWidth);
    }

    function convertTimeToLength(aPlaybackTime) {
        return aPlaybackTime / trackDuration * trackBarWidth;
    }

    function getStreamingStatus() {
        return isStreaming;
    }

    function getPausedStatus() {
        return isNeverPaused;
    }

    function resetFaderPosition() {
        faderPosition = 0;
    }

    function setStreamingState(aCondition) {
        isStreaming = aCondition;
    }

    function setInitialPauseState(aCondition) {
        isNeverPaused = aCondition;
    }

    function setModifiedPlaybackTimeStatus(aCondition) {
        isplaybackTimeChanged = aCondition;
    }

    function resetAudioData() {
        resetData();
        resetFaderPosition();
        clearInterval(progressTimer);
        disconnectAudio();
        setStreamingState(false);
        setModifiedPlaybackTimeStatus(false);
    }


})(window, document, window.jQuery);