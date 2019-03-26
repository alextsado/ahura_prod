const SSD_MOBILENETV1 = 'ssd_mobilenetv1'
const TINY_FACE_DETECTOR = 'tiny_face_detector'
const MTCNN = 'mtcnn'


let selectedFaceDetector = SSD_MOBILENETV1

// ssd_mobilenetv1 options
let minConfidence = 0.5

// tiny_face_detector options
let inputSize = 512
let scoreThreshold = 0.5

//mtcnn options
let minFaceSize = 20

function getFaceDetectorOptions() {
  return selectedFaceDetector === SSD_MOBILENETV1
    ? new faceapi.SsdMobilenetv1Options({ minConfidence })
    : (
      selectedFaceDetector === TINY_FACE_DETECTOR
        ? new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
        : new faceapi.MtcnnOptions({ minFaceSize })
    )
}

function onIncreaseMinConfidence() {
  minConfidence = Math.min(faceapi.round(minConfidence + 0.1), 1.0)
  document.getElementById('minConfidence').value = minConfidence;
  updateResults()
}

function onDecreaseMinConfidence() {
  minConfidence = Math.max(faceapi.round(minConfidence - 0.1), 0.1)
  document.getElementById('minConfidence').value = minConfidence;
  updateResults()
}

function onInputSizeChanged(e) {
  changeInputSize(e.target.value)
  updateResults()
}

function changeInputSize(size) {
  inputSize = parseInt(size)
}

function onIncreaseScoreThreshold() {
  scoreThreshold = Math.min(faceapi.round(scoreThreshold + 0.1), 1.0)
  document.getElementById('scoreThreshold').value = scoreThreshold;
  updateResults()
}

function onDecreaseScoreThreshold() {
  scoreThreshold = Math.max(faceapi.round(scoreThreshold - 0.1), 0.1)
  document.getElementById('scoreThreshold').value = scoreThreshold;
  updateResults()
}

function onIncreaseMinFaceSize() {
  minFaceSize = Math.min(faceapi.round(minFaceSize + 20), 300)
  document.getElementById('minFaceSize').value = minFaceSize;
}

function onDecreaseMinFaceSize() {
  minFaceSize = Math.max(faceapi.round(minFaceSize - 20), 50)
  document.getElementById('minFaceSize').value = minFaceSize;
}

function getCurrentFaceDetectionNet() {
  if (selectedFaceDetector === SSD_MOBILENETV1) {
    return faceapi.nets.ssdMobilenetv1
  }
  if (selectedFaceDetector === TINY_FACE_DETECTOR) {
    return faceapi.nets.tinyFaceDetector
  }
  if (selectedFaceDetector === MTCNN) {
    return faceapi.nets.mtcnn
  }
}

function isFaceDetectionModelLoaded() {
  return !!getCurrentFaceDetectionNet().params
}

async function changeFaceDetector(detector) {
  //['#ssd_mobilenetv1_controls', '#tiny_face_detector_controls', '#mtcnn_controls'].forEach(id => document.getElementById(id).style.display = 'none');

  selectedFaceDetector = detector
  //const faceDetectorSelect = document.getElementById('selectFaceDetector')
  //faceDetectorSelect.value = detector;

  //document.getElementById('#loader').style.display = "content";
  if (!isFaceDetectionModelLoaded()){
    await getCurrentFaceDetectionNet().load('/')
  }
}
