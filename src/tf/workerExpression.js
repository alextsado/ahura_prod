importScripts("utils/faceEnvWorkerPatch.js"); // Monkey patch to run in webworker
importScripts("https://unpkg.com/@tensorflow/tfjs-core@1.7.0/dist/tf-core.js");
importScripts("face-api.js");

let faceApiModelReady = false;
// let detectorOptions;
let facemeshWorkerPort;

const MODEL_URLS = {
  // Mobilenetv1Model:
  //   "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/faceapi/ssd_mobilenetv1_model-weights_manifest.json",
  // TinyFaceDetectorModel:
  //   "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/faceapi/tiny_face_detector_model-weights_manifest.json",
  // FaceLandmarkModel:
  //   "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/faceapi/face_landmark_68_model-weights_manifest.json",
  // FaceLandmark68TinyNet:
  //   "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/faceapi/face_landmark_68_tiny_model-weights_manifest.json",
  // FaceRecognitionModel:
  //   "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/faceapi/face_recognition_model-weights_manifest.json",
  FaceExpressionModel:
    "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_expression_model-weights_manifest.json",
};

async function setup() {
  try {
    await loadFaceApi();
    faceApiModelReady = true;
    console.log("Face-api.js Loaded");
    // postMessage({ modelIsReady: true });
  } catch (err) {
    console.error("Can't load expression model: ", err);
  }
}
setup();

async function loadFaceApi() {
  // tiny = true,
  // minConfidence = 0.5,
  // scoreThreshold = 0.5
  /* Load ~~face landmark / detector /~~ expression models
  Adapted from https://github.com/ml5js/ml5-library/blob/main/src/FaceApi/index.js */
  // if (tiny) {
  //   await faceapi.loadFaceLandmarkTinyModel(
  //     MODEL_URLS["FaceLandmark68TinyNet"]
  //   );
  //   await faceapi.loadTinyFaceDetectorModel(
  //     MODEL_URLS["TinyFaceDetectorModel"]
  //   );
  // } else {
  //   await faceapi.loadFaceLandmarkModel(MODEL_URLS["FaceLandmarkModel"]);
  //   await faceapi.loadSsdMobilenetv1Model(MODEL_URLS["Mobilenetv1Model"]);
  // }
  // await faceapi.loadFaceRecognitionModel(MODEL_URLS["FaceRecognitionModel"]);
  await faceapi.loadFaceExpressionModel(MODEL_URLS["FaceExpressionModel"]);

  // if (tiny === true) {
  //   detectorOptions = new faceapi.TinyFaceDetectorOptions({
  //     scoreThreshold: scoreThreshold,
  //     inputSize: 512,
  //   });
  // } else {
  //   detectorOptions = new faceapi.SsdMobilenetv1Options({
  //     minConfidence: minConfidence,
  //   });
  // }
}

async function handleExpressionPrediction(evt) {
  const pixels = new ImageData(
    new Uint8ClampedArray(evt.data.pixels),
    evt.data.width,
    evt.data.height
  );
  const faceBox = new faceapi.Box(evt.data.largestFaceBox).clipAtImageBorders(
    evt.data.width,
    evt.data.height
  );

  const tensor = await tf.browser.fromPixels(pixels);
  let faceTensor = await faceapi.extractFaceTensors(tensor, [faceBox]);
  faceTensor = faceTensor[0];

  const expressionPreds =
    await faceapi.nets.faceExpressionNet.predictExpressions(faceTensor);

  tensor.dispose();
  faceTensor.dispose();

  return expressionPreds;
}

onmessage = function (evt) {
  /* Incoming messages are from facemesh dedicated worker
     Posting message with results goes back to main thread
    */
  if (evt.data.port) {
    facemeshWorkerPort = evt.data.port;
    console.log(
      "Expression worker: set port to receive face detections from Facemesh worker"
    );

    // Listen for face detection results from facemesh
    facemeshWorkerPort.onmessage = async (evt) => {
      // console.log("Expression worker received data from facemesh:", evt.data);
      if (faceApiModelReady) {
        const t0 = performance.now();
        const preds = await handleExpressionPrediction(evt);
        // console.log("Expression pred:", performance.now() - t0);

        // Return expression preds to the main thread
        postMessage({
          expression: preds,
        });
      }
    };
  }
};
