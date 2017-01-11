  $(document).ready(function() {

      var requestAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
          window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

      var sound = document.getElementById('sound'),
          audioCtx = new AudioContext(),
          source = audioCtx.createMediaElementSource(sound),
          analyser = audioCtx.createAnalyser(),
          frequencyData = new Uint8Array(analyser.frequencyBinCount);

      var visualizer = document.getElementById('visualizer'),
          canvas = document.querySelector('#visualizer > canvas'),
          ctx = canvas.getContext('2d'),
          canvasWidth = canvas.width,
          canvasHeight = canvas.height;

      var freqs = [60, 90, 130, 225, 320, 453, 640, 900, 1300, 1800, 2500, 3000, 4500, 6000, 8000, 10000, 12000, 14000, 15000, 16000];

      sound.crossOrigin = "anonymous";

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

      function setSrc() {
          sound.src = 'https://api.soundcloud.com/tracks/289610873/stream?client_id=8f474de4d1dedd5a6a4f4cbb60f4e6b8';
      };

      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      setSrc();
      start();

  });