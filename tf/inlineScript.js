/**
 * copied from the inline javascript of a face-api demo so that it works as a plugin.
 * Modified to no longer use jQuery.
 *
 * @modified by Barnaby Bienkowski
 */
let forwardTimes = []
let withBoxes = true


function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30)
  const avgTimeInMs = forwardTimes.reduce((total, t) => total + t) / forwardTimes.length
}

function howDoIFeel(apiResult) {
  let answer = {expression: "foo", probability: 0}
  for (feeling in apiResult.expressions) {
	if (apiResult.expressions[feeling].probability > answer.probability) {
	  answer = apiResult.expressions[feeling]
	}
  }
  return answer
}
let away_from_computer_counter = null;

function show_away_from_computer_overlay(){
   chrome.runtime.sendMessage({
        "type": "open_window"
    });

    document.getElementById("overlay_bg").style.display = "block";
    document.getElementById("away_from_computer_overlay_content").style.display = "block";
}

function trigger_away_from_computer(){
    if(!away_from_computer_counter){
        away_from_computer_counter = setTimeout(function(){
            show_away_from_computer_overlay();
        }, 5000);
    } 
}

function trigger_at_computer(){
    if(!!away_from_computer_counter){
        clearTimeout(away_from_computer_counter);
        away_from_computer_counter = null;
    }
}


async function onPlay() {
  const videoEl = document.getElementById('inputVideo');

  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
	return setTimeout(() => onPlay())


  const options = getFaceDetectorOptions()

  const ts = Date.now()

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  const result1 = await faceapi.detectSingleFace(videoEl, options).withFaceExpressions()
  
  try {
    howDoIFeel(result1)["expression"];
	document.getElementById("emotion_display").innerText = "User detected.";
    trigger_at_computer();
	//document.getElementById("emotion_display").innerText = howDoIFeel(result1)["expression"];
  }
  catch(err) {
	document.getElementById("emotion_display").innerText = "No user detected.";
    trigger_away_from_computer();
	console.log(err)
  }

  updateTimeStats(Date.now() - ts)

  if (result && result1) {
	drawLandmarks(videoEl, document.getElementById('overlay'), [result], withBoxes)
  }

  setTimeout(() => onPlay())
}

async function run() {
  // load face detection and face landmark models
  await changeFaceDetector(TINY_FACE_DETECTOR)
  await faceapi.loadFaceLandmarkModel('/tf/')
  await faceapi.loadFaceExpressionModel('/tf/')
  changeInputSize(224)

  // try to access users webcam and stream the images
  // to the video element
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  const videoEl = document.getElementById('inputVideo');
  videoEl.srcObject = stream
}

function updateResults() {}

document.addEventListener("DOMContentLoaded", function(event) { 
  run()
});
