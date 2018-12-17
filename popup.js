/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */
"use strict";
import { submit_button_click } from "./topicSubmit.js";
import { user_name_click } from "./user_name.js";
import { show_relevant_keywords, keyword_click, keyword_cancel_click } from "./keywords.js";
import { make_transitional } from "./transitional.js";

// ------------------------------------------
// Routing
// -------------------------------------------------

/*
 * Route any messages relevant to the functionality of the window
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Message from a newly loaded page
    if(msg.type === "summary_text"){
        summary_text(msg, sender, sendResponse);   
    }else if(msg.type === "end_session"){
        is_ongoing_session = false;
        document.querySelector("#ongoing_study").style.display = "none";
        document.querySelector("#collection_content").style.display = "contents";
    }
});

/*
 * Set up event listeners
 */
window.onload = function(){
    setup_display();

    document.querySelector("#user_name_submit").addEventListener("click",
        event =>  user_name_click(event));
    document.querySelector("#submit_button").addEventListener("click",
        event =>  submit_button_click(event, () => { is_ongoing_session = true; }));
    document.querySelector("#stop_session").addEventListener("click",
        event =>  stop_session_click(event));

    //handle dynamically added elements through bubbling
    document.querySelector("#add_pages_visited").addEventListener("click", event => {
        let target = event.target;
        if(target.classList.contains("make_relevant_button")){
            show_relevant_keywords(event);
        }else if(target.classList.contains("keyword_link")){
            keyword_click(event);
        }else if(target.classList.contains("make_transitional")){
            make_transitional(event);
        }else if(target.classList.contains("cancel_button")){
            keyword_cancel_click(event);
        }
    });
}

/*
 * Prevent the user from inadvertantly closing the window.
 */
let is_ongoing_session = false;

/*
 * Media Library
 */
let media = new MediaLib();

/*
 * Prevent the user from closing the window by accident 
 * if they have a session going on
 */
window.onbeforeunload = function(){
    if(is_ongoing_session){
        return "Closing this window will end your study session";
    }
}

// ----------------------------------
// message Listeners
// -------------------------------------------------

/*
 * Handle a summary text  message from the content page
 */
function summary_text(msg, sender, sendResponse){
    console.log("got the summary text");
    console.log(msg, sender);
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
            page_visited.classList.add("page_history");
            page_visited.setAttribute("page_id", xhr.response.page_id);
            let page_visited_template = "";
            if(xhr.response.is_relevant){
                page_visited_template = `
                    <div class="alert alert-success row" 
                    style="font-size: 12px; overflow: hidden; white-space: nowrap;">
                        ${sender.url}
                    </div>
                `
            }else{
                let keyword_string = xhr.response.keywords;
                page_visited_template = `
                    <div class="alert alert-warning row">
                        <div class="row">
                        <div class="col-8"
                        style="font-size: 12px; overflow: hidden; white-space: nowrap;">
                            ${sender.url}
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-secondary">
                                Ignore
                            </button>
                        </div>
                        </div>
                        <div class="row">
                            <div class="col-4 align-self-end">
                                <button class="btn btn-success make_relevant_button"
                                    type="button" noun_keywords="${keyword_string}">
                                    Make Relevant
                                </button>
                    </div>
                `
                //page_visited.style.color = "red";
                //let parent_div = document.createElement("div");
                //parent_div.classList.add("make_relevant_content");
                //let make_relevant_button = document.createElement("a");
                //make_relevant_button.setAttribute("href", "#");
                //make_relevant_button.classList.add("make_relevant_button");
                //make_relevant_button.append("Make relevant");
                //make_relevant_button.setAttribute("noun_keywords", xhr.response.keywords);
                //parent_div.append(make_relevant_button);
                //page_visited.append(parent_div);
            }
            //document.querySelector("#add_pages_visited").append(page_visited);
            document.querySelector("#add_pages_visited").insertAdjacentHTML(
                "afterend", page_visited_template);
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
        if(!!response && !!response.success){
            is_ongoing_session = false;
            document.querySelector("#ongoing_study").style.display = "none";
            document.querySelector("#collection_content").style.display = "contents";
        }else{
            console.log("errors");
            document.querySelector("#error_content")
                .innerText = "There was an error in closing this session";
            document.querySelector("#error_content").style.display = "contents";
        }
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
    chrome.storage.sync.get(["end_time", "user_name", "user_id"], result => {
        //If there's an ongoing study session then show the ongoing dialog
        if(!!result && result.end_time && new Date() < new Date(result.end_time)){
            document.querySelector("#ongoing_study").style.display = "contents";
            document.querySelector("#collection_content").style.display = "none";
        }
        //TODO try to do the import of the user_name functionality here instead of at the top
        //If it's the first time then there's no username and no user id
        if(!!result && !!result.user_name && result.user_name.length >= 1){
            console.log("There is a username", result.user_name);
            document.querySelector("#user_name_greeting").innerText = result.user_name;
        }else{ //There is no username 
            document.querySelector("#collection_content").style.display = "none";
            document.querySelector("#greeting").style.display = "none";
            document.querySelector("#user_name_form").style.display = "contents";
        }
    });
}
