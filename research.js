/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */
"use strict";
import { media } from "./mediaLib.js";
import { show_relevant_keywords, keyword_click, keyword_cancel_click } from "./keywords.js";
import { make_transitional } from "./transitional.js";

// ------------------------------------------
// Routing
// -------------------------------------------------

let session_id;
let description;
let end_time;
let user_id;
let session_end_timer;

/*
 * Route any messages relevant to the functionality of the window
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Message from a newly loaded page
    if(msg.type === "summary_text"){
        summary_text(msg, sender, sendResponse);   
    }else if(msg.type === "end_session"){
        console.log("called end_session");
        media.stop_recording();
        return {"success": true}
    }
});

/*
 * Set up event listeners
 */
window.onload = function(){
    setup_display();

    document.querySelector("#stop_session").addEventListener("click",
        event =>  stop_session_click(event));

    //handle dynamically added elements through bubbling
    document.querySelector("#add_pages_visited").addEventListener("click", event => {
        let target = event.target;
        if(target.classList.contains("make_relevant_button")){
            show_relevant_keywords(event);
        }else if(target.classList.contains("keyword_link")){
            keyword_click(event);
        }else if(target.classList.contains("make_transitional_button")){
            make_transitional(event);
        }else if(target.classList.contains("cancel_button")){
            keyword_cancel_click(event);
        }
    });
}

/*
 * Prevent the user from closing the window by accident 
 * if they have a session going on
 */
window.onbeforeunload = function(){
    return "Closing this window will end your study session";
}

// ----------------------------------
// message Listeners
// -------------------------------------------------

/*
 * Handle a summary text  message from the content page
 */
function summary_text(msg, sender, sendResponse){
    console.log(msg, sender);
    let pkg = {
        "doc_title": msg.doc_title,
        "url": sender.url,
        "content": msg.message,
        "load_time": msg.load_time,
        "is_relevant": true,
        "tab_id": sender.tab.id
    }
    let xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status <= 299){
            chrome.storage.sync.set({
                "is_relevant" : xhr.response.is_relevant,
                "keywords": xhr.response.keywords,
                "page_id": xhr.response.page_id
            });

            const page_id = xhr.response.page_id;
            let page_visited_template = "";
            if(xhr.response.is_transitional){
                page_visited_template = `
                    <div class="alert alert-dark row page_list_item" page_id="${page_id}"> 
                        <div class="row history_title">
                            ${msg.doc_title}
                        </div>
                        <div class="row history_url">
                            ${sender.url}
                        </div>
                    </div>
                `
            }else if(xhr.response.is_relevant){
                page_visited_template = `
                    <div class="alert alert-success row page_list_item" page_id="${page_id}">
                        <div class="row history_title">
                            ${msg.doc_title}
                        </div>
                        <div class="row history_url">
                            ${sender.url}
                        </div>
                    </div>                `
            }else{
                let keyword_string = xhr.response.keywords;
                let rand_id = "make_relevant_" + Math.round(Math.random()*100000);
                page_visited_template = `
                    <div class="alert alert-warning row page_list_item row" page_id="${page_id}">
                        <div class="row history_title">
                            ${msg.doc_title}
                        </div>
                        <div class="row history_url">
                            ${sender.url}
                        </div>
                    <div style="width: 100%" class="page_list_buttons_div">
                        <a href="#" class="make_transitional_button">
                            Ignore
                        </a>
                        <a href="#" class="make_relevant_button" id="${rand_id}" noun_keywords="${keyword_string}">
                            Make Relevant
                        </a>
                    </div>
                `
            }
            document.querySelector("#add_pages_visited").insertAdjacentHTML(
                "afterbegin", page_visited_template); //afterbegin prepends it, beforeend appends
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

// ---------------------------------------------------
// Event Listeners
// ------------------------------------------------

/*
 * Clicking stop_session button ends the session
 *
 * Here the background manages the state in case the 
 * user tries to close the window right away
 */
function stop_session_click(){
    let stop_time = new Date();
    //TODO add a spinner?
    chrome.runtime.sendMessage({
        "type": "stop_session",
        "stop_time": stop_time.getTime(),
    }, response => {
        window.onbeforeunload = null;
        media.stop_recording();
        window.location = "enter_topic.html";
        return true;
    });
}

/*
 * When the page loads first check whether there's an ongoing session (unlikely)
 * and whether the user has already logged in before and provided a name. If they
 * haven't then ask them for their name.
 *
 */
function setup_display(){
    var inputVideo = $("#inputVideo");
    inputVideo.on("play", onPlay);

    chrome.storage.sync.get(["session_id", "end_time", "user_name", "user_id", "description"], result => {
        //Check that everything is OK
        if(!result || !result.session_id || !result.user_name || new Date() > new Date(result.end_time)){
           console.error("THERE WAS SOMETHING WRONG WITH SAVING THE SESSION"); 
        }
        document.getElementById("populate_description").innerText = result.description;
        
        // calculate how much time is left in the session
        let end_time = new Date(result.end_time)
        function get_timer(){
            let diff = end_time - new Date(); 
            let mins = Math.floor((diff/1000) / 60); 
            let secs = Math.floor((diff/1000) % 60); 
            if(secs < 10){
                secs = "0" + secs;
            }
            return "" + mins + ":" + secs;
        }
        
        //Update the clock every second using the above calculations
        setInterval(function(){document.getElementById("populate_countdown_clock").innerText = get_timer();}, 1000)

        // set the session_end timer to end in the correct number of minutes
        console.log("setting session_end_timer");
        let duration = end_time - new Date(); 
        console.log(duration);
        session_end_timer = setTimeout(function(){
            chrome.runtime.sendMessage({"type": "end_session"});
            chrome.storage.sync.set({
                "session_id": null,
                "description": null, 
                "keywords": null,
                "end_time": null
            });
            window.location = "enter_topic.html";
        }, duration);

    });
}
