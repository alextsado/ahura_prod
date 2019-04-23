/**
 * copied from the inline javascript of a face-api demo so that it works as a plugin.
 * Modified to no longer use jQuery.
 *
 * @modified by Barnaby Bienkowski
 */

let forwardTimes = []
let withBoxes = true
let afk_request_return_verification = false;


function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30)
  const avgTimeInMs = forwardTimes.reduce((total, t) => total + t) / forwardTimes.length
}

function howDoIFeel(apiResult) {
  let answer = {expression: "foo", probability: 0}
    console.log(apiResult.expressions);
  for (feeling in apiResult.expressions) {
	if (apiResult.expressions[feeling].probability > answer.probability) {
	  answer = apiResult.expressions[feeling]
	}
  }
  return answer
}
let away_from_computer_counter = null;

function show_away_from_computer_overlay(){
    let afk_event = new Event("afk_event");
    document.dispatchEvent(afk_event);
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
    if(afk_request_return_verification){
        console.log("send an event to rescan");
        let afk_return_verification = new Event("afk_return_verification");
        document.dispatchEvent(afk_return_verification);
        afk_request_return_verification = false;
    }
}


async function onPlay() {
  const videoEl = document.getElementById('inputVideo');

  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded()){
	return setTimeout(() => onPlay());
  }


  const options = getFaceDetectorOptions()

  const ts = Date.now()
    let result;
  try {
      result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
      if(!!result){
          document.getElementById("emotion_display").innerText = "User detected.";
          trigger_at_computer();
      }else{
          document.getElementById("emotion_display").innerText = "No user detected.";
          trigger_away_from_computer();
      }
  }catch(err) {
      document.getElementById("emotion_display").innerText = "No user detected.";
      //trigger_away_from_computer();
  }

  updateTimeStats(Date.now() - ts)

  if(!!result) {
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
  videoEl.srcObject = stream;

    var inputVideo = document.getElementById("inputVideo");
    inputVideo.addEventListener("play", onPlay);
}

function updateResults() {}

document.addEventListener("DOMContentLoaded", function(event) { 
    run();
    document.addEventListener("afk_request_return_verification", e =>{
        console.log("setting request for verification to true");
        afk_request_return_verification = true
    });
});
