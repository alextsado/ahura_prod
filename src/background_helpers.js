/**
 * Methods used inside the listeners of the background script.
 * This keeps things clean so that the only code in background is the listeners
 * while the method definitions are in this file
 *
 * @Author Barnaby B.
 * @Since May 15, 2019
 */


/*
 * Bring the window to the forefront, or open it up if it isn't already.
 */
export function open_window(chat_window){
    if(!!chat_window){
        try{
            chrome.windows.update(chat_window.id, {"focused": true });  
        }catch(e){
            console.log(e);
            chat_window = null;
        }
    }
    if(!chat_window){
        chrome.storage.local.get(["user_id"], results => {
            let open_url;// = "research.html";
            if(!!results && !!results.user_id){
                open_url = "/html/enter_topic.html";
            }else{
                open_url = "/html/user_name.html";
            }
            chrome.windows.create({
                url: chrome.runtime.getURL(open_url),
                type: "popup",
                "focused": true,
                "width": 1020,
                "height": 600
            }, win => {
                chat_window = win;
            });
        });
    }
}

/**
 * Handle a user clicking to stop the session. Send it to 
 * the server and remove all of the local storage about the ongoing session.
 *
 * TODO this should also handle when a user closes the window.
 */
export function stop_session(msg, sender, sendResponse){

    //media.stop_recording();
    chrome.storage.local.get(["session_id", "start_time", "user_id"], results => {
        if(!results || !results.session_id){
            console.error("There is no session ID but we called STOP on it");
        }
        let pkg = {
            "user_id": results.user_id,
            "stop_time": msg.stop_time
        }

        let session_id = results.session_id;

        fetch(`${globals.api_url}/sessions/${session_id}/`, {
            method: "POST",
            body: JSON.stringify(pkg),
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin"
        }).then(function(response){
            if(response.status <= 299){
                //media.stop_recording();
                chrome.storage.local.set({
                    "session_id": null,
                    "start_time": null
                });
                if(!!sendResponse){
                    sendResponse({"success": true});
                }
            }  
        }, function(error){
            console.log(error.message);
        });
    });
}

