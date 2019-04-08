/**
 * When we get the summary content of a page send it to the API to check 
 * for relevance.
 *
 * @Author Barnaby B.
 * @Since Nov 12, 2018
 */

"use strict";
import { globals } from "./globals.js";

/*
 * Route messages from other parts of the app accordingly.
 * TODO move "topic_submit" out of messages, and just let the window handle it
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Stop the session
    if(msg.type === "stop_session"){
        return stop_session(msg, sender, sendResponse);
    }
    if(msg.type === "open_window"){
        console.log("received command: about to foreground");
        open_window();
    }
    return true;
});


/*
 * Get the browser ID and users name
 */
let user_id, user_name = null;
let chat_window = null;
//chrome.storage.sync.remove('user_id', function(result){ console.log("removed user_id"); }); //only uncomment this line debugging if you have reset the DB.


chrome.storage.sync.get(['user_id', 'user_name'], result => {
    if(!!result && !!result.user_id && result.user_id.length >= 1 && !!result.user_name && result.user_name.length >= 1){
        user_id = result.user_id;
        user_name = result.user_name;
    }else{
        open_window();
    }
});

chrome.tabs.onActivated.addListener(activateInfo => {
    chrome.tabs.sendMessage(activateInfo.tabId, {
        type: "rescan"
    });
});

/**
 * When a user clicks the icon then open a new window
 */

chrome.browserAction.onClicked.addListener(function(tab) {
    open_window();
});

/*
 * Bring the window to the forefront, or open it up if it isn't already.
 */
function open_window(){
    if(!!chat_window){
        try{
            chrome.windows.update(chat_window.id, {"focused": true });  
        }catch(e){
            console.log(e);
            chat_window = null;
        }
    }
    if(!chat_window){
        fetch(`${globals.api_url}/ping-when-plugin-opened/`, {method: "get"})
        //TODO check whether there is a username. If no username then open user_name.html, otherwise enter_topic.htl
        chrome.storage.sync.get(["user_id"], results => {
            let open_url;// = "research.html";
            if(!!results && !!results.user_id){
                open_url = "enter_topic.html";
            }else{
                open_url = "user_name.html";
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


chrome.windows.onRemoved.addListener(window_id => {
    if(!!chat_window && window_id === chat_window.id){
        chat_window = null;
    }
    let stop_time = new Date().getTime();
    stop_session({"stop_time": stop_time});
});


/**
 * Handle a user clicking to stop the session. Send it to 
 * the server and remove all of the local storage about the ongoing session.
 *
 * TODO this should also handle when a user closes the window.
 */
function stop_session(msg, sender, sendResponse){

    //media.stop_recording();
    let session_id = null;
    let pkg = {
        "user_id": user_id,
        "stop_time": msg.stop_time
    }


    chrome.storage.sync.get(["session_id", "start_time", "user_id"], results => {
        if(!results || !results.session_id){
            throw new Exception("There is no session ID but we called STOP on it");
        }
        session_id = results.session_id;


        fetch(`${globals.api_url}/sessions/${session_id}/`, {
            method: "POST",
            body: JSON.stringify(pkg),
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin"
        }).then(function(response) {

            if (response.status <= 299) {
                //media.stop_recording();
                chrome.storage.sync.set({
                    "session_id": null,
                    "start_time": null
                });
                sendResponse({"success": true});
            }  
        }, function(error) {
            console.log(error.message); //=> String
        })
    });
}
