/**
 * copied from the inline javascript of a face-api demo so that it works as a plugin
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

async function onPlay() {
  const videoEl = document.getElementById('inputVideo');

  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
	return setTimeout(() => onPlay())


  const options = getFaceDetectorOptions()

  const ts = Date.now()

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  const result1 = await faceapi.detectSingleFace(videoEl, options).withFaceExpressions()
  
  try {
	document.getElementById("emotion_display").innerText = howDoIFeel(result1)["expression"];
  }
  catch(err) {
	document.getElementById("emotion_display").innerText = "No face detected";
      //TODO if we can't recognize a face that means that they stepped away. After five seconds create an alert and foreground the app
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
