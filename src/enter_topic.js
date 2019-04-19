/**
 * Control the page for entering the topic
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */
"use strict";
import { globals } from "./globals.js";
import { escape_for_display } from "./escape_for_display.js";

// ------------------------------------------
// Routing
// -------------------------------------------------
let user_name = null;
let user_id = null;

/*
 * Set up event listeners
 */
window.onload = function(){
    populate_datalist();
    document.querySelector("#enter_topic_form").addEventListener("submit",
        event =>  submit_button_click(event));

    chrome.storage.sync.get(["user_name", "user_id"], result => {
        //TODO if user_name or user_id are null then go back to the enter-username page
        user_name = result.user_name;
        user_id = result.user_id;
        document.querySelector("#user_name_greeting").innerText = result.user_name;
    });
}

/*
 * Prevent the user from closing the window by accident 
 * if they have a session going on
 */
window.onbeforeunload = null;
    
/*
 * Add elements to the datalist based on what the server tells us.
 */
function populate_datalist(){
    let study_list = document.getElementById("study_list");
    chrome.storage.sync.get(["user_id"], result => {
        fetch(`${globals.api_url}/users/${result.user_id}/study_suggestions/`, {
            headers: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            method: "GET"
        }).then( response => {
            if(response.ok){
                response.json().study_list.forEach( study_item => {
                    let cleaned_keywords = escape_for_display(study_item.keywords);
                    let cleaned_type = escape_for_display(study_item.item_type);
                    let item_tag = `<OPTION value="${cleaned_keywords}">
                        ${cleaned_type}</OPTION>`;
                    study_list.insertAdjacentHTML("afterbegin", item_tag);
                });
            }else{
                console.log("unable to display suggestions. it's just a regular input for now;");
            }
        });
    });
}

/*
 * When a user clicks the submit button to start a new session
 */
function submit_button_click(event){
    event.preventDefault();
    let start_time = new Date();
    //TODO remove jQuery!!!
     //var inputVideo = $("#inputVideo");
     //inputVideo.on("play", onPlay);

    let description = document.querySelector("[name=description]").value
    //document.querySelector("#tf_canvas").style.display = "contents";
    //document.querySelector("#tf_emotion").style.display = "contents";
    //document.querySelector("#error_content").style.display = "none";
    if(!!description){
        create_topic_submission_spinner();
        topic_submit({
            "description": description, 
            'start_time': start_time.getTime()
        }).then(function(session_id){
            document.location = "research.html";
        }, show_error_text);
    }else{
        document.getElementById("study_description").style.border = "2px solid red";
        show_error_text("Please fill in all required fields.");
    }
    return false;
}

/*
 * Display the given error, or a default text, in the pages error display
 */
function show_error_text(error = "Please fill in all required fields"){
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
    let topic_submission_form = document.getElementById("collection_content");
    //let my_rect = topic_submission_form.getBoundingClientRect();
    let spinner = document.createElement("img");
    spinner.setAttribute("src", "/images/spinner.gif");
    spinner.setAttribute("id", "topic_submission_spinner");
    spinner.style.position = "absolute";
    spinner.style.top = "100px";// my_rect.x;
    spinner.style.left = "190px";//my_rect.y;
    spinner.style.width = "150px";
    document.querySelector("#collection_content").append(spinner);
}



/*
 * Handle a topic submission from the popup page.
 */
function topic_submit(msg){
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get("user_id", results => {
            if(!results || !results.user_id || results.user_id.length <= 0){
                throw new Exception("There was no user id stored in this app.");
            }

            fetch(`${globals.api_url}/sessions/`, {
                body: JSON.stringify({
                    "user_id": results.user_id,
                    "time_started": msg.start_time,
                    "description": msg.description,
                    "additional_keywords": msg.additional_keywords,
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
                //TODO what if the back-end didn't recognize any keywords?

                if(!response.keywords || response.keywords.length <= 1){
                    document.getElementById("study_description").style.border = "2px solid red";
                    show_error_text("We didn't find any keywords in your subject. Please rephrase your entry.");
                    let rem_me = document.getElementById("topic_submission_spinner");
                    rem_me.parentElement.removeChild(rem_me);
                }else{
                    chrome.storage.sync.set({
                        "session_id": response.session_id,
                        "start_time": msg.start_time,
                        "description": msg.description,
                        "keywords": response.keywords}, result => {
                            resolve(response.session_id);
                    });
                }
            }).catch(error => alert(error));
        });
    });
    return false;
}
