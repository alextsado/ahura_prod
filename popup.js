/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */

/*
 * Route any messages relevant to the functionality of the window
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Message from a newly loaded page
    if(msg.type === "summary-text"){
        summary_text(msg, sender, sendResponse);   
    }
});

/*
 * Handle a summary text  message from the content page
 */
function summary_text(msg, sender, sendResponse){
    //TODO may have to get the session ID from sync
    let pkg = {
        "url": sender.url,
        "content": msg.message,
        "load_time": msg.load_time
    }
    let xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status <= 299){
            chrome.storage.sync.set({
                "is_relevant" : xhr.response.is_relevant,
                "keywords": xhr.response.keywords,
                "page_id": xhr.response.page_id
            });
            let page_visited = document.createElement("div")
            page_visited.append(sender.url)
            if(xhr.response.is_relevant){
                page_visited.style.color = "green";
            }else{
                page_visited.style.color = "red";
            }
            document.querySelector("#add_pages_visited").append(page_visited);
        }
    }

    chrome.storage.sync.get(["session_id", "end_time", "user_id"], results => {
        if(!results || !results.session_id){
            throw new Exception("There is no session ID but we called STOP on it");
        }
        pkg["session_id"] = results.session_id;
        xhr.open("POST", "http://13.59.94.191/pages/")
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = "json";

        xhr.send(JSON.stringify(pkg));
    });
    return true;
}

/*
 * Prevent the user from inadvertantly closing the window
 */
let is_ongoing_session = false;
let media_recorder; //will store the video in 6 second chunks for upload



/**
* Upload the webcamera stream every 6 seconds.
* TODO call this when a user starts a new session.
*/
function setup_media_recording(){
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
      media_recorder = new MediaRecorder(stream);
      media_recorder.ondataavailable = e => {
          upload_blob(e.data);
      }
    });
}


/**
 * If the media_recorder is set up then start recording in 6 second intervals
 */
function start_recording(){
    if(!!media_recorder){
        media_recorder.start(6000);
    }else{
        alert("Failed to start media recorder. Please reload the page and try again.")
    }
}


/**
 * POST the video clip
 */
function upload_blob(video_data){
    alert("upload_blob is not implemented");
}



window.onbeforeunload = function(){
    //TODO put a message into the chat area since it probably won't show up in the popup;
    if(is_ongoing_session){
        return "Closing this window will end your study session";
    }
};

window.onload = function(){
    //If there's an ongoing study session then show the ongoing dialog
    chrome.storage.sync.get("end_time", result => {
        if(new Date() < new Date(result.end_time)){
            document.querySelector("#ongoing_study").style.visibility = "visible";
            document.querySelector("#collection_content").style.visibility = "hidden";
        }
    });

    /*
     * When a user clicks the submit button then get the values, make sure they're not empty
     * and send a message to the background so that it can start the session and everything.
     */
    document.querySelector("#submit_button").addEventListener("click", event => {
        let time_started = new Date();
        let description = document.querySelector("[name=description]").value
        let additional_keywords = document.querySelector(
            "[name=additional_keywords]").value;
        let duration = document.querySelector("[name=duration]").value;
        if(!!description){

            chrome.runtime.sendMessage({
                "type": "topic-submit",
                "description": description + " . " + additional_keywords,
                'additional_keywords': additional_keywords,
                'duration': duration,
                'time_started': time_started.getTime()
            }, function(response){
                console.log("success! " + new Date().getTime());
                console.log(response);
                if(!!response && !!response.success){
                    is_ongoing_session = true;
                    document.querySelector("#ongoing_study")
                        .style.visibility = "visible";
                    document.querySelector("#collection_content")
                        .style.visibility = "hidden";
                }else{
                    if(!!response && !!response.error){
                        document.querySelector("#error_content").innerText = response.error;
                        document.querySelector("#error_content").style.visibility = "visible";
                    }else{
                        document.querySelector("#error_content").innerText = "Unkown Error";
                        document.querySelector("#error_content").style.visibility = "visible";
                    }
                }
                return true;
            })
        }else{
            console.log("errors");
            document.querySelector("#error_content")
                .innerText = "Please fill out both form fields";
            document.querySelector("#error_content").style.visibility = "visible";
        }
    });

    /**
     * Clicking the "complete session" button makes the session end.
     * No more sending things and the user is able to start a new session.
     *
     * TODO add   media_recorder.stop();
     */
     document.querySelector("#stop_session").addEventListener("click", event => {
         let stop_time = new Date();
         //TODO add a spinner?
         chrome.runtime.sendMessage({
             "type": "stop_session",
             "stop_time": stop_time.getTime(),
         }, response => {
            if(!!response && !!response.success){
                is_ongoing_session = false;
                document.querySelector("#ongoing_study").style.visibility = "hidden";
                document.querySelector("#collection_content").style.visibility = "visible";
            }else{
                console.log("errors");
                document.querySelector("#error_content")
                    .innerText = "There was an error in closing this session";
                document.querySelector("#error_content").style.visibility = "visible";
            }
             return true;
         });
     });
}
