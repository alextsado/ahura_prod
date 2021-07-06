importScripts(
  "https://unpkg.com/@tensorflow/tfjs-core@2.4.0/dist/tf-core.js",
  "https://unpkg.com/@tensorflow/tfjs-converter@2.4.0/dist/tf-converter.js",
  "https://unpkg.com/@tensorflow/tfjs-backend-cpu@2.4.0/dist/tf-backend-cpu.js",
  "https://unpkg.com/@tensorflow/tfjs-backend-webgl@2.4.0/dist/tf-backend-webgl.js",
  "https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js",
  "cv-utils.js"
);

let width = 640,
  height = 480;
let facemeshModel;
let expressionWorker;
let facemeshModelReady;
let expressionWorkerReady;
let poseEstimator = new PoseEstimator(width, height); // CV utility to calculate poses
let frameCounter = 0; // Count each frame pred to help space out expression preds

const setup = async () => {
  try {
    await loadFacemesh();
  } catch (err) {
    console.error("Can't load model: ", err);
  }
  facemeshModelReady = true;
  postMessage({ modelIsReady: true });
};
setup();

async function loadFacemesh() {
  /* Face Landmark Detection model
  See https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection */
  facemeshModel = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
  );
  console.log("Facemesh model loaded");
}

async function detectFaces(pixels) {
  const detections = await facemeshModel.estimateFaces({
    input: pixels,
    returnTensors: false,
    flipHorizontal: false,
    predictIrises: true,
  });
  return detections;
}

/*
 * Predict incoming frames from main thread
 * Return face landmark & iris detections to main
 * Pass on largest face pred to expression worker through MessageChannel port
 */
let expressionWorkerPort;

onmessage = async function (evt) {
  // console.log("Facemesh Worker: Message received from main script", evt);
  if (evt.data.port) {
    // Save MessageChannel port used to post to expression worker
    expressionWorkerPort = evt.data.port;
    console.log("Facemesh worker: set port for Expression worker");
  } else if (evt.data.pixels) {
    const pixels = new ImageData(
      new Uint8ClampedArray(evt.data.pixels),
      evt.data.width,
      evt.data.height
    );

    if (facemeshModelReady && facemeshModel) {
      const detections = await detectFaces(pixels);

      if (detections && detections.length > 0) {
        const poses = poseEstimator.calculatePoses(detections);
        postMessage({
          detections: detections,
          poses: poses,
        });

        if (
          evt.data.expressionPredEvery &&
          frameCounter % evt.data.expressionPredEvery == 0 &&
          expressionWorkerPort
        ) {
          /* Find box around largest detected face
             Do it in this worker so we don't have to pass dets to expression subworker */
          const largestFaceBox = extractLargestFaceBox(detections);
          // Pass off image pixel buffer and box to crop for Expression pred
          expressionWorkerPort.postMessage(
            {
              pixels: evt.data.pixels, // Hot potato buffer from main to expression worker
              width: evt.data.width,
              height: evt.data.height,
              largestFaceBox: largestFaceBox,
            },
            [evt.data.pixels]
          );
        }

        frameCounter += 1;
      } else {
        postMessage({
          detections: [],
          poses: null,
        });
      }
    }
  } else {
    // TODO handle bad message
  }
};

/*
 * Utils
 */
function extractLargestFaceBox(detections) {
  // TODO calculate largest box
  let det = detections[0];
  // let area =
  //   (det.boundingBox.bottomRight[0] - det.boundingBox.topLeft[0]) *
  //   (det.boundingBox.bottomRight[1] - det.boundingBox.topLeft[1]);
  const landmarkXs = det.scaledMesh.map((lm) => lm[0]);
  const landmarkYs = det.scaledMesh.map((lm) => lm[1]);

  const xMin = Math.min(...landmarkXs);
  const xMax = Math.max(...landmarkXs);
  const yMin = Math.min(...landmarkYs);
  const yMax = Math.max(...landmarkYs);
  const width = xMax - xMin;
  const height = yMax - yMin;

  return {
    x: xMin,
    y: yMin,
    width: width,
    height: height,
  };
}
