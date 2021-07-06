let globals = {
  distraction_counter: 0,
  afk_counter: null,
  distraction_threshold: 3,
  is_ongoing_session: false,
  api_url: 'http://3.132.191.11/*',
  webapp_api_url: 'https://crmapis.sharemeister.com/v1',
  notification_link: 'https://www.ahura.ai/#/profile',
  notification_title: 'Ahura AI',
  notification_message_plain: 'Away from computer',
  notification_image: '',
};


let afkCounter = null;
let user_id = null;
let session_id = null;
const expressionInterval = 10000;
const afkInterval = 5000;

let w = 340,
  h = 300;

let video;
let canvas;
let ctx;
let offscrCanvas;
let offscrCtx;
let detections; // Landmark detections from facemesh
let poses; // Calculated poses from PnP
let expression; // Expression/emotion predictions
let webWorkerExpression;
let webWorkerFacemesh;
let webWorkerFacemeshReady = false;
let webWorkerMC = new MessageChannel();
// const facemeshInterval = 10; // interval for sending frames to facemesh worker
const facemeshInterval = null; // no throttling for facemesh, send frames as soon as worker ready
const expressionPredEvery = 8; // skip every n frames before predicting expression
////const statsFacemesh = new Stats(); // Track facemesh prediction FPS
// const statsExpression = new Stats(); // Track pose estimation calc time

async function setup() {
  // Start loading async to not interrupt the video render
  loadModels();

  // Stats.js panels for facemesh & face-api (expression) worker FPS
  //// statsFacemesh.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  //// statsFacemesh.domElement.style.position = "fixed";
  //// statsFacemesh.domElement.style.top = "0px";
  //// statsFacemesh.domElement.style.left = w - 80 + "px";
  //// document.getElementById("face-container").appendChild(statsFacemesh.dom);
  // statsExpression.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  // statsExpression.domElement.style.position = "fixed";
  // statsExpression.domElement.style.top = "50px";
  // statsExpression.domElement.style.left = w - 80 + "px";
  // document.getElementById("container").appendChild(statsExpression.dom);

  textStyle(BOLD);
  textSize(12);

  // Drawing canvas for predictions, this is a transparent overlay
  canvas = createCanvas(w, h);
  ////canvas.parent("face_canvas");
  canvas.style(
    'position: absolute; top: 90px; left: auto; z-index: 9999; background: rgba(0,0,0,0.0); right: 20px'
  );
  canvas.parent('face_canvas');

  ctx = canvas.elt.getContext('2d');
  // Offscreen canvas used as buffer to shuffle frames to workers
  offscrCanvas = new OffscreenCanvas(0, 0);
  offscrCtx = offscrCanvas.getContext('2d');
  offscrCanvas.width = w;
  offscrCanvas.height = h;

  video = createCapture(
    {
      audio: false,
      video: {
        width: w,
        height: h,
      },
    },
    function () {
      console.log('video ready');
    }
  );
  video.size(w, h);
  // video.position(0, 0, 'fixed');
  video.style('position: absolute; top: 90px; left: auto; right: 20px');
  video.parent('face_canvas');
  // video.hide();

  // send expression data in database after every 10sec
  setInterval(() => {
    triggerExpression(expression);
  }, expressionInterval);
}

async function loadModels() {
  /* Load Facemesh worker */
  console.log('Facemesh prediction interval =', facemeshInterval);
  webWorkerFacemesh = new Worker(
    chrome.runtime.getURL('src/tf/workerFacemesh.js')
  );
  webWorkerFacemesh.onmessage = evt => {
    // console.log("<Main thread: message received from facemesh worker", evt);
    if (evt.data.modelIsReady) {
      console.log('Facemesh worker ready signal');
      webWorkerFacemeshReady = true;
      // setInterval(predictFrameFacemesh, facemeshInterval);
    } else if (evt.data.detections) {
      // Handle Facemesh predictions
      ////statsFacemesh.end();
      detections = evt.data.detections;
      poses = evt.data.poses;
      requestAnimationFrame(drawPredictions);
    } else {
      // TODO handle bad message
    }

    webWorkerFacemeshReady = true;

    if (facemeshInterval != null && typeof facemeshInterval == 'number') {
      setTimeout(predictFrameFacemesh, facemeshInterval);
    } else {
      // Setup next prediction if we're not restricted to a prediction interval
      predictFrameFacemesh();
    }
  };

  /* Load expression worker */
  webWorkerExpression = new Worker(
    chrome.runtime.getURL('src/tf/workerExpression.js')
  );
  webWorkerExpression.onmessage = evt => {
    // console.log("Message received from Expression worker", evt);
    if (evt.data.expression) {
      expression = evt.data.expression; // Update latest expression pred
      // requestAnimationFrame(drawPredictions);
    }
  };

  /* Setup MessageChannel for Facemesh worker to pass results to Expression */
  webWorkerMC = new MessageChannel();
  webWorkerFacemesh.postMessage({ port: webWorkerMC.port1 }, [
    webWorkerMC.port1,
  ]);
  webWorkerExpression.postMessage(
    {
      port: webWorkerMC.port2,
    },
    [webWorkerMC.port2]
  );
}

function predictFrameFacemesh(now, metadata) {
  if (webWorkerFacemeshReady) {
    ////statsFacemesh.begin();
    offscrCtx.drawImage(video.elt, 0, 0, w, h);
    // See https://github.com/tensorflow/tfjs/issues/102
    const pixels = offscrCtx.getImageData(0, 0, w, h);

    webWorkerFacemeshReady = false;

    webWorkerFacemesh.postMessage(
      {
        pixels: pixels.data.buffer,
        width: w,
        height: h,
        channels: 4,
        expressionPredEvery: expressionPredEvery,
      },
      [pixels.data.buffer]
      // Transfer imageData by reference
      // See https://www.kevinhoyt.com/2018/10/31/transferable-imagedata/
    );
  }
}

function drawPredictions() {
  /* Draw face landmarks & expression on canvas
     Only called after predictions returned by workers */
  clear();

  //// Uncomment to draw video frames to canvas
  // image(video, 0, 0, w, h);

  if (detections && detections.length > 0) {
    triggerAtComputer();
    drawLandmarks(detections);
  } else {
    triggerAwayFromComputer();
  }
}

//-----------------Drawing & utility functions-------------------------
function drawPoses(poses) {
  colorMode(RGB);

  for (let i = 0; i < poses.length; i += 1) {
    // Draw pose axes
    strokeWeight(2);
    stroke('red');
    line(poses[i].pNose.x, poses[i].pNose.y, poses[i].pZ.x, poses[i].pZ.y);
    stroke('green');
    line(poses[i].pNose.x, poses[i].pNose.y, poses[i].pY.x, poses[i].pY.y);
    stroke('blue');
    line(poses[i].pNose.x, poses[i].pNose.y, poses[i].pX.x, poses[i].pX.y);

    // Convert to ints
    roll = ~~poses[i].roll;
    yaw = ~~poses[i].yaw;
    pitch = ~~poses[i].pitch;

    // Draw euler angles as text at axis ends
    noStroke();
    textAlign(CENTER);
    fill('red');
    text(roll, poses[i].pZ.x, poses[i].pZ.y);
    fill('green');
    text(yaw, poses[i].pY.x, poses[i].pY.y);
    fill('blue');
    text(pitch, poses[i].pX.x, poses[i].pX.y);

    // Draw angles text on frame, but only for first pose
    if (i == 0) {
      noStroke();
      textAlign(LEFT, BOTTOM);
      fill(0, 240, 0);
      let poseText = 'yaw ' + yaw + '\npitch ' + pitch + '\nroll ' + roll;
      text(poseText, 10, h - 10);
    }
  }
}

function drawLandmarks(detections) {
  colorMode(RGB);
  noStroke();
  for (let i = 0; i < detections.length; i += 1) {
    const keypoints = detections[i].scaledMesh;

    for (let j = 0; j < keypoints.length; j += 1) {
      const [x, y] = keypoints[j];

      if (j < 468) {
        // 468 face landmarks
        fill(0, 255, 0);
      } else {
        // 10 iris landmarks
        fill(255, 0, 0);
      }
      ellipse(x, y, 4, 4);
    }
  }
}

function drawExpression(expressions) {
  let keys = Object.keys(expressions);
  let expression_label = keys.reduce((a, b) =>
    expressions[a] > expressions[b] ? a : b
  );
  let expression_idx = keys.findIndex(k => k == expression_label);
  let expression_prob = round(expressions[expression_label] * 100, 2) / 100;

  colorMode(HSB);
  textAlign(LEFT);
  noStroke();
  fill(map(expression_idx, 0, keys.length, 0, 360), 100, 100);
  text(expression_label + ': ' + expression_prob, 10, 20);
}

function drawBox(detections) {
  colorMode(RGB);
  for (let i = 0; i < detections.length; i += 1) {
    const topLeft = detections[i].boundingBox.topLeft;
    const bottomRight = detections[i].boundingBox.bottomRight;
    const boxWidth = bottomRight[0] - topLeft[0];
    const boxHeight = bottomRight[1] - topLeft[1];

    noFill();
    stroke(161, 95, 251);
    strokeWeight(2);
    rect(topLeft[0], topLeft[1], boxWidth, boxHeight);
  }
}
//-------------------triggers-----------------------------------
function triggerAwayFromComputer() {
  if (!afkCounter) {
    afkCounter = setTimeout(function () {
      showAwayFromComputerOverlay();
      console.log('User away from camera!');
    }, afkInterval);
  }
}

function triggerAtComputer() {
  if (afkCounter) {
    clearTimeout(afkCounter);
    afkCounter = null;
    console.log('User return!');
    // afkReturnVerification();
  }
}

function triggerExpression(expressions) {
  if (expressions && !afkCounter) {
    if (!user_id && !session_id) {
      chrome.storage.sync.get(['session_id', 'user_id'], results => {
        if (results && results.session_id && results.user_id) {
          console.log(user_id, session_id);
          session_id = results.session_id;
          user_id = results.user_id;
          handleExpression(user_id, session_id, expressions);
        }
      });
    } else {
      handleExpression(user_id, session_id, expressions);
    }
  }
}

function handleExpression(user_id, session_id, expressions) {
  let keys = Object.keys(expressions);
  let expression_label = keys.reduce((a, b) =>
    expressions[a] > expressions[b] ? a : b
  );
  let expression_prob = round(expressions[expression_label] * 100, 2) / 100;
  const additional_details = JSON.stringify({
    expression_data: expressions
  });

  const expressionParams = {
    expression_name: expression_label,
    expression_intensity: expression_prob,
    additional_details: additional_details,
    user_id: user_id,
    session_id: session_id,
  };

  fetch(`${globals.api_url}/emotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expressionParams),
  }).then(response => {
    console.log(response);
  });
}

//-------------------ext functions-------------------------
function showAwayFromComputerOverlay() {
  chrome.storage.sync.get(
    ['user_id', 'user_client_id', 'session_id', 'externalWebAppTabID'],
    results => {
      if (
        results &&
        results.session_id &&
        results.user_client_id &&
        results.user_id &&
        results.externalWebAppTabID
      ) {
        fetch(`${globals.webapp_api_url}/send_push_notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_message_plain: globals.notification_message_plain,
            notification_title: globals.notification_title,
            notification_image: globals.notification_image,
            user_client_id: results.user_client_id,
            notification_link: globals.notification_link,
          }),
        }).then(response => {
          chrome.tabs.sendMessage(results.externalWebAppTabID, {
            type: 'distracted',
          });
        });
      }
    }
  );
}

function afkReturnVerification() {
  console.log('received return verification');

  // check of all items in storage to stop flooding the listener
  chrome.storage.sync.get(
    ['user_id', 'user_client_id', 'session_id', 'externalWebAppTabID'],
    results => {
      if (
        results &&
        results.session_id &&
        results.user_client_id &&
        results.user_id &&
        results.externalWebAppTabID
      ) {
        chrome.tabs.sendMessage(results.externalWebAppTabID, {
          type: 'not-distracted',
        });
      }
    }
  );
}
