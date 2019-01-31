/**
 * copied from the inline javascript of a face-api demo so that it works as a plugin
 */
let forwardTimes = []
let withBoxes = true

function onChangeHideBoundingBoxes(e) {
  withBoxes = !$(e.target).prop('checked')
}

function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30)
  const avgTimeInMs = forwardTimes.reduce((total, t) => total + t) / forwardTimes.length
  $('#time').val(`${Math.round(avgTimeInMs)} ms`)
  $('#fps').val(`${faceapi.round(1000 / avgTimeInMs)}`)
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
  const videoEl = $('#inputVideo').get(0)

  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
	return setTimeout(() => onPlay())


  const options = getFaceDetectorOptions()

  const ts = Date.now()

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  const result1 = await faceapi.detectSingleFace(videoEl, options).withFaceExpressions()
  
  try {
	console.log(howDoIFeel(result1))
  }
  catch(err) {
	console.log(err)
  }

  updateTimeStats(Date.now() - ts)

  if (result && result1) {
	drawLandmarks(videoEl, $('#overlay').get(0), [result], withBoxes)
	//drawExpressions(videoEl, $('#overlay1').get(0), [result1], withBoxes)
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
  const videoEl = $('#inputVideo').get(0)
  videoEl.srcObject = stream
}

function updateResults() {}

$(document).ready(function() {
  var inputVideo = $("#inputVideo");
  inputVideo.on("play", onPlay);
  initFaceDetectionControls()
  run()
})
