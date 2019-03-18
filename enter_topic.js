/**
 * Control the page for entering the topic
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */
"use strict";
import { globals } from "./globals.js";

// ------------------------------------------
// Routing
// -------------------------------------------------
let user_name = null;
let user_id = null;

/*
 * Set up event listeners
 */
window.onload = function(){
    fetch`${globals.api_url}/ping-when-plugin-opened/`, {method: "get"})
    document.querySelector("#submit_button").addEventListener("click",
        event =>  submit_button_click(event));

    chrome.storage.sync.get(["user_name", "user_id"], result => {
        //TODO if user_name or user_id are null then go back to the enter-username page
        user_name = result.user_name;
        user_id = result.user_id;
        document.querySelector("#user_name_greeting").innerText = result.user_name;
    })
}

/*
 * Prevent the user from closing the window by accident 
 * if they have a session going on
 */
window.onbeforeunload = null;
    

/*
 * When a user clicks the submit button to start a new session
 */
function submit_button_click(event){
    let time_started = new Date();
    //TODO remove jQuery!!!
     //var inputVideo = $("#inputVideo");
     //inputVideo.on("play", onPlay);

    let description = document.querySelector("[name=description]").value
    let duration = document.querySelector("[name=duration]").value;
    //document.querySelector("#tf_canvas").style.display = "contents";
    //document.querySelector("#tf_emotion").style.display = "contents";
    //document.querySelector("#error_content").style.display = "none";
    if(!!description){
        create_topic_submission_spinner();
        topic_submit({
            "description": description, 
            'duration': duration,
            'time_started': time_started.getTime()
        }).then(function(session_id){
            document.location = "research.html";
        }, show_error_text);
    }else{
        show_error_text("Please fill out both form fields");
    }
    return false;
}

/*
 * Display the given error, or a default text, in the pages error display
 */
function show_error_text(error = "Unknown Error"){
    document.querySelector("#error_content").innerText = error;
    document.querySelector("#error_content").style.display = "contents";
}



/*
function set_session_id_remove_spinner(session_id){
    //Remove the spinner so it doesn't show up later;
    let topic_submission_spinner = document.querySelector("#topic_submission_spinner");
    if(!!topic_submission_spinner){
        topic_submission_spinner.parentNode.removeChild(topic_submission_spinner);
    }
    //TODO set the session id in sync and redirect
    //media.session_id = session_id;
    //media.start_recording();
    globals.is_ongoing_session = true;
    document.location = "research.html";
}
*/

/*
 * Put a spinner on top of the submission form
 */
function create_topic_submission_spinner(){
    console.log("creating the topic submission_spinner");
    let topic_submission_form = document.getElementById("collection_content");
    let my_rect = topic_submission_form.getBoundingClientRect();
    let spinner = document.createElement("img");
    spinner.setAttribute("src", "spinner.gif");
    spinner.setAttribute("id", "topic_submission_spinner");
    spinner.style.position = "absolute";
    spinner.style.top = my_rect.x;
    spinner.style.left = my_rect.y;
    spinner.style.width = "150px";
    document.querySelector("body").append(spinner);
}



/*
 * Handle a topic submission from the popup page.
 */
function topic_submit(msg){
    console.log("msg is");
    console.log(msg);
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get("user_id", results => {
            if(!results || !results.user_id || results.user_id.length <= 0){
                throw new Exception("There was no user id stored in this app.");
            }

            fetch(`${globals.api_url}/sessions/`, {
                body: JSON.stringify({
                    "user_id": results.user_id,
                    "time_started": msg.time_started,
                    "description": msg.description,
                    "additional_keywords": msg.additional_keywords,
                    "duration": msg.duration
                }),
                headers: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                method: "post"
            }).then(response => {
                if(response.ok){
                    return response.json();
                }else{
                    throw new Exception(response.statusText);
                }
            }).then(response => {

                let end_time = msg.time_started + msg.duration* 60000;
                chrome.storage.sync.set({
                    "session_id": response.session_id,
                    "end_time": end_time,
                    "description": msg.description,
                    "keywords": response.keywords}, result => {
                        console.log("saved session to disk " + new Date().getTime());
                        resolve(response.session_id);
                });
            }).catch(error => alert(error));
        });
    });
}
