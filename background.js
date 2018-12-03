/**
 * When we get the summary content of a page send it to the API to check 
 * for relevance.
 *
 * @Author Barnaby B.
 * @Since Nov 12, 2018
 */

/*
 * Route messages from other parts of the app accordingly.
 * TODO move "topic-submit" out of messages, and just let the window handle it
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //message from newly submitted form
    if(msg.type === "topic-submit"){
        topic_submit(msg, sender, sendResponse);
    }
   
    //Stop the session
    else if(msg.type === "stop_session"){
        stop_session(msg, sender, sendResponse);
    }
    return true;
});


/*
 * Generate a random user ID in case one doesn't already exist
 */
let session_end_timer = null;


/*
 * Get the browser ID
 */
let user_id = null;
let chat_window = null;
//chrome.storage.sync.remove('user_id', function(result){ console.log("removed user_id"); }); //only uncomment this line debugging if you have reset the DB.
chrome.storage.sync.get('user_id', function(result){
    if(!!result && !!result.user_id) {
        user_id = result.user_id;
    } else {
        //TODO make an AJAX call here instead and get the UUID
        xhr = new XMLHttpRequest();
        xhr.open("POST", "http://13.59.94.191/users/")
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = "json";
        xhr.onreadystatechange = function(){
            if(xhr.readyState === 4) {
                new_user_id = xhr.response.user_id; // ??JSON.parse
                chrome.storage.sync.set({"user_id": new_user_id}, function() {
                    user_id = new_user_id;
                });
            }
        }
        xhr.send(JSON.stringify({"password": "VH2Cjg'mme=>U[UG"}));
    }
});


/**
 * When a user clicks the icon then open a new window
 */

chrome.browserAction.onClicked.addListener(function(tab) {
    if(!!chat_window){
        try{
            chrome.windows.update(chat_window.id, { "focused": true });  
        }catch(e){
            console.log(e);
            chat_window = null;
        }
    }
    if(!chat_window){
        chrome.windows.create({
            url: chrome.runtime.getURL("popup.html"),
            type: "popup",
            "focused": true,
            "width": 550,
            "height": 850
        }, win => {
            chat_window = win;
        });
    }
});

chrome.windows.onRemoved.addListener(window_id => {
    if(!!chat_window && window_id === chat_window.id){
        console.log("THEY CLOSED THE WINDOW!!!");
        chat_window = null;
    }
});

/*
 * Handle a topic submission from the popup page.
 */
function topic_submit(msg, sender, sendResponse){
    console.log("got it " + new Date().getTime());
    let pkg = {
        "user_id": user_id,
        "time_started": msg.time_started,
        "description": msg.description,
        "additional_keywords": msg.additional_keywords,
        "duration": msg.duration
    }
    //TODO make sure that all of the @parameters from the API are in the pkg
    console.log(pkg);

    xhr = new XMLHttpRequest();
    xhr.open("POST", "http://13.59.94.191/sessions/")
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.responseType = "json";
    let end_time = msg.time_started + msg.duration* 60000;

    xhr.onreadystatechange = function() {
        if(xhr.readyState === 4 && xhr.status < 299){
            console.log("setting session_id to " + xhr.response.session_id);
            keywords = xhr.response.keywords;
            chrome.storage.sync.set({
                "session_id": xhr.response.session_id,
                "end_time": end_time,
                "description": msg.description,
                "keywords": keywords}, result => {
                    console.log("saved session to disk " + new Date().getTime());
                    sendResponse({"success": true});
            });

            session_end_timer = setTimeout(function(){
                //TODO message the window so that it can change the display of the session.
                chrome.storage.sync.set({"session_id": null, "description": null, 
                    "keywords": null, "end_time": null}, function(){
                        console.log("saved session to disk");
                });
            }, msg.duration*60000);
        }
    }
    xhr.send(JSON.stringify(pkg));
    console.log("about to return true " + new Date().getTime());
    return true;
}


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
            //TODO maybe instead of saving this... send it to the content page itself so that the user can adjust it there?
            chrome.storage.sync.set({
                "is_relevant" : xhr.response.is_relevant,
                "keywords": xhr.response.keywords,
                "page_id": xhr.response.page_id
            });
        }
        //TODO update the popup page so that it can show the user that their page was found relevant or not.
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


/**
 * Handle a user clicking to stop the session. Send it to 
 * the server and remove all of the local storage about the ongoing session.
 */
function stop_session(msg, sender, sendResponse){
    session_end_timer = null;
    let session_id = null;
    let pkg = {
        "user_id": user_id,
        "stop_time": msg.stop_time
    }
    let xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
        if(xhr.readyState === 4 && xhr.status <= 299){
            chrome.storage.sync.set({
                "session_id": null,
                "end_time": null
            });
        }
        sendResponse({"success": true});
    }

    chrome.storage.sync.get(["session_id", "end_time", "user_id"], results => {
        if(!results || !results.session_id){
            throw new Exception("There is no session ID but we called STOP on it");
        }
        session_id = results.session_id;
        xhr.open("POST", "http://13.59.94.191/sessions/"+ session_id + "/")
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = "json";

        xhr.send(JSON.stringify(pkg));
    });
    return true;
}


//CODE FOR EVENTUAL MEDIA RECORDING!!!


     /**
      * Upload the webcamera stream every 6 seconds.
      *
      function setup_media_recording(){
        navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
          media_recorder = new MediaRecorder(stream);
          media_recorder.ondataavailable = e => {
              upload_blob(e.data);
          }
        });
      }



	let media_recorder; //will store the video in 6 second chunks for upload



    function start_recording(){
        if(!!media_recorder){
            media_recorder.start(6000);
            log_event({
                "EventType": {S: EVENT_TYPES.start_recording}, 
                "PlayerLength": {N: String(player.getDuration())},
            });
        }else{
            alert("Failed to start media recorder. Please reload the page and try again.")
        }
    }




stop_button.addEventListener("click", e=>{    
	media_recorder.stop();
});


*/

