/**
 * copied from the inline javascript of a face-api demo so that it works as a plugin.
 * Modified to no longer use jQuery.
 *
 * @modified by Barnaby Bienkowski
 */

import { globals }  from "../src/globals.js";
import { get_page_list_element } from "../src/keywords.js";

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
    //TODO send a message to the server after 5 seconds unless somebody clicks that they're back
    globals.afk_counter = setTimeout(function(){
        chrome.storage.sync.get(["session_id"], results => {
            fetch(`${globals.api_url}/pages/`, {
                method: "POST",
                headers: { "Content-Type": "application/json;charset=UTF-8"},
                body: JSON.stringify({"afk_doc": true, "session_id": results.session_id, "load_time": new Date().getTime()}),
            }).then(()=>{
                let add_pages_visited = document.querySelector("#add_pages_visited");
                let page_visited_row = get_page_list_element({
                    "is_transitional": false,
                    "is_relevant": false,
                    "doc_title": "Away from computer",
                    "page_id": "",
                    "keywords": "",
                });
                add_pages_visited.insertAdjacentHTML(
                    "afterbegin", page_visited_row);
            });
            //TODO display an AFK segment in the URL history
        });
    });
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


export async function onPlay() {
  const videoEl = document.getElementById('inputVideo');

  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded()){
	return setTimeout(() => onPlay());
  }


  const options = getFaceDetectorOptions()

  const ts = Date.now()
    let result, result1;

    try{
      result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
      result1 = await faceapi.detectSingleFace(videoEl, options).withFaceExpressions()
    }catch(e){
        //const result = null;
        //const result1 =null;
    }
  
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

  if(!!result && !!result1) {
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
