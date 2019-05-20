/**
 * Sets all of the listeners for interacting with the app.
 * The messages from the content script are currently handled by the window because 
 * the window is always open when a session is in progress.
 *
 * The window cannot be reliably trusted to end the session because users can close it. 
 * This background handles that, as well as opening the window. If the user closes the
 * window this background ends the session.
 * 
 * When a user switches tabs this background sends the signal to rescan.
 *
 * @Author Barnaby B.
 * @Since Nov 12, 2018
 */

"use strict";
import { get_todays_alarm_time, is_past_time, user_met_goal_today } from "./alarm_helper.js";
import { open_window, stop_session } from "./background_helpers.js";

//chrome.storage.local.remove('user_id', function(result){ console.log("removed user_id"); }); //only uncomment this line debugging if you have reset the DB.

let chat_window = null;  // The chat window. Its presence indicates that there is a sessison ongoing. Once it is closed then a listener ends the sessison on the DB. TODO also close the session when the browser is closed, and when the computer gets put to sleep or crashes.


/*
 * Route messages from other parts of the app accordingly.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Stop the session
    if(msg.type === "stop_session"){
        return stop_session(msg, sender, sendResponse);
    }
    if(msg.type === "open_window"){
        open_window(chat_window, win => chat_window = win);
    }
    return true;
});


/*
 * When the app starts check whether a user_id has been set
 * If not then open a window so that users can get started
 */
chrome.storage.local.get(['user_id', 'user_name'], result => {
    if(!!result && !!result.user_id &&
        result.user_id.length >= 1 &&
        !!result.user_name && result.user_name.length >= 1){
        console.log(`starting app with user ${result.user_name}, id: ${result.user_id}`);
    }else{
        open_window(chat_window, win => chat_window = win);
    }
});

//Create an alarm called study_time that runs every 15 minutes.
chrome.alarms.create("testint", {periodInMinutes: 1});
chrome.alarms.create("study_time", {periodInMinutes: 15});
//When study_time alarm is called then check if it's the users' daily study time. 
//If it is then open up the window
chrome.alarms.onAlarm.addListener( alarm => {
    if(alarm.name === "testint"){
        console.log("testing the alarm functionality");
    } //TODO Delete me

    if(alarm.name === "study_time"){
        get_todays_alarm_time().then( alarm_time => {
            if(is_past_time(alarm_time) && !!chat_window){
                user_met_goal_today().then( met_goal => {
                    if(!met_goal){
                        open_window(chat_window, win => chat_window = win); //TODO optionally add a message for display on the window
                    }
                });
            }
        });
    }
});
    

/*
 * When a user switches tabs re-scan the existing tab
 */
chrome.tabs.onActivated.addListener(activateInfo => {
    chrome.tabs.sendMessage(activateInfo.tabId, {
        type: "rescan"
    });
});

/**
 * When a user clicks the icon then open a new window
 */
chrome.browserAction.onClicked.addListener(function(tab) {
    open_window(chat_window, win => chat_window = win);
});

/*
 * When the user closes the chat window then set it to null and end the session.
 */
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
