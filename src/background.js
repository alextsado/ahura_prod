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

let chat_window = null;  // The chat window. Its presence indicates that there is a sessison ongoing. Once it is closed then a listener ends the sessison on the DB. TODO also close the session when the browser is closed, and when the computer gets put to sleep or crashes.

//chrome.storage.local.remove('user_id', function(result){ console.log("removed user_id"); }); //only uncomment this line debugging if you have reset the DB.


chrome.storage.local.get(['user_id', 'user_name'], result => {
    if(!!result && !!result.user_id && result.user_id.length >= 1 && !!result.user_name && result.user_name.length >= 1){
        user_id = result.user_id;
        user_name = result.user_name;
    }else{
        open_window();
    }
});


/*
 * Determine the day of the week, and get todays alarm time
 */
function get_todays_alarm_time(){
    return new Promise((resolve, reject) => {
        //If there is no schedule set, then set it to 3:00 every day
        let default_alarm_times = {
            "last_synched": new Date(),
            "monday": "15:00:00",
            "tuesday": "15:00:00",
            "wednesday": "15:00:00",
            "thursday": "15:00:00",
            "friday": "15:00:00",
            "saturday": "",
            "sunday": ""
        }

        let cur_day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()]  
        chrome.storage.local.get(['alarm_times', "user_id"], result => {
            if(!!result.alarm_times){
                resolve(result.alarm_times[cur_day])
            }else{
                fetch(`${globals.api_url}/users/${result.user_id}/goals/`).then( get_response => {
                    if(!!response.ok && !!response.json()){
                        chrome.storage.local.set({"alarm_times": get_response.json()});
                        resolve(default_alarm_times[cur_day]);
                    }else{
                        fetch(`${globals.api_url}/users/${result.user_id}/goals/`,{
                            headers: {
                                "Content-Type": "application/json;charset=UTF-8"
                            },
                            credentials: "same-origin",
                            method: "POST",
                            body: JSON.stringify(default_alarm_times)
                        }).then( response => {
                            if(!response.ok){
                                console.log("for some reason the server did not save the default goal settings");
                            }
                            chrome.storage.local.set({"alarm_times": default_alarm_times});
                            resolve(default_alarm_times[cur_day]);
                        });
                    }
                });
            }
        });
    });
}


//Create an alarm called study_time that runs every 15 minutes.
chrome.alarms.create("study_time", {periodInMinutes: 15});
//When study_time alarm is called then check if it's the users' daily study time. 
//If it is then open up the window
chrome.alarms.onAlarm.addListener( alarm => {
    if(alarm.name === "study_time"){
        //TODO if the alarm time in the database is equal to or greater than the alarm time.
            //TODO which day of the week is it, what time is our alarm supposed to be today?
            //TODO then if there isn't an ongoing session, or todays total session time is greater than the goal,
            //TODO then open up the app window
            }
        });
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


chrome.windows.onRemoved.addListener(window_id => {
    if(!!chat_window && window_id === chat_window.id){
        chat_window = null;
    }
    chrome.storage.local.get(["session_id"], results => {
        if(!!results && !!results.session_id){
            let stop_time = new Date().getTime();
            stop_session({"stop_time": stop_time});
        }
    });
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


    chrome.storage.local.get(["session_id", "start_time", "user_id"], results => {
        if(!results || !results.session_id){
            console.error("There is no session ID but we called STOP on it");
        }
        session_id = results.session_id;


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
