/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since March 2019
 */
"use strict";
//import { media } from "./mediaLib.js";
import { show_relevant_keywords, keyword_click, keyword_cancel_click, get_page_list_element } from "./keywords.js";
import { escape_for_display } from "./escape_for_display.js";
import { make_transitional } from "./transitional.js";
import { globals } from "./globals.js";

// ------------------------------------------
// Routing
// -------------------------------------------------

let session_id;
let description;
let start_time;
let user_id;
let session_timer;

/*
 * Route any messages relevant to the functionality of the window
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Message from a newly loaded page
    if(msg.type === "summary_text"){
        summary_text(msg, sender, sendResponse);   
    }else if(msg.type === "end_session"){
        media.stop_recording();
        return {"success": true}
    }
});

/*
 * Set up event listeners
 */
window.onload = function(){
    setup_display();

    document.getElementById("make_relevant_overlay_link").addEventListener("click",
        event => hide_distracted_overlay(event));

    document.getElementById("make_relevant_cancel_button").addEventListener("click",
            event => hide_relevant_overlay(event));

    document.getElementById("close_away_overlay_button").addEventListener("click",
        event => hide_away_overlay(event));

    document.getElementById("close_distraction_overlay_button").addEventListener("click",
        event => get_back_to_studying(event));

    document.querySelector("#stop_session").addEventListener("click",
        event =>  stop_session_click(event));

    // Handle dynamically added 'make relevant' links through bubbling
    document.querySelector("#populate_make_relevant").addEventListener("click", event => {
        let target = event.target;
        if(target.classList.contains("keyword_link")){
            keyword_click(event);
        }
    });


    //handle dynamically added webpage list items through bubbling
    document.querySelector("#add_pages_visited").addEventListener("click", event => {
        let target = event.target;
        if(target.classList.contains("make_relevant_button")){
            show_relevant_keywords(target);
        }else if(target.parentElement.classList.contains("make_relevant_button")){
            show_relevant_keywords(target.parentElement);
        }else if(target.classList.contains("make_transitional_button")){
            make_transitional(event);
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

/**
 * Show an overlay to tell the user that we think they're distracted.
 */
function show_distracted_overlay(){
    document.getElementById("overlay_bg").style.display = "block";
    document.getElementById("distracted_overlay_content").style.display = "block";
}

/**
 * Hide the overlay that was telling the user that we think they've stepped away from the computer.
 */
function hide_relevant_overlay(){
    document.getElementById("overlay_bg").style.display = "none";
    document.getElementById("relevant_overlay_content").style.display = "none";
    document.getElementById("populate_make_relevant").innerHTML = "";
}

/**
 * Hide the overlay that was telling the user that we think they've stepped away from the computer.
 */
function hide_away_overlay(){
    document.getElementById("overlay_bg").style.display = "none";
    document.getElementById("away_from_computer_overlay_content").style.display = "none";
}
/**
 * Hide the overlay that was telling the user that we think they're distracted.
 */
function hide_distracted_overlay(){
    document.getElementById("overlay_bg").style.display = "none";
    document.getElementById("distracted_overlay_content").style.display = "none";
}

/**
 * Close the overlay, subtract a point from the distraction counter.
 * Open a new tab that has a search for relevant topics.
 */
function get_back_to_studying(event){
    console.log("closing the overlay and taking away one distraction point");
    hide_distracted_overlay();
    globals.distraction_counter--;
    chrome.storage.sync.get("keywords", results => {
        let keywords_list = results.keywords.split("~").filter(el => el.length > 0);
        let relevant_topic = keywords_list[0];
        let win = window.open(`https://google.com/search?q=${relevant_topic}`, '_blank');
        win.focus();
    });
}


// ----------------------------------
// message Listeners
// -------------------------------------------------

/*
 * Handle a summary text  message from the content page
 */
function summary_text(msg, sender, sendResponse){
    let pkg = {
        "doc_title": msg.doc_title,
        "url": sender.url,
        "content": msg.message,
        "load_time": msg.load_time,
        "is_relevant": true,
        "tab_id": sender.tab.id
    }


    chrome.storage.sync.get(["session_id", "start_time", "user_id"], results => {
        if(!results || !results.session_id){
            throw new Exception("There is no session ID but we called STOP on it");
        }
        pkg["session_id"] = results.session_id;
        fetch(`${globals.api_url}/pages/`, {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8"},
            body: JSON.stringify(pkg),
        }).then(response => {
            if(response.ok){
                return response.json();
            }else{
                throw new Error("Network response was not OK");
            }
        }).then( response => {
            let add_pages_visited = document.querySelector("#add_pages_visited");
            //TODO add the doc title into the returned fields in the server
            response.doc_title = msg.doc_title;
            let page_visited_row = get_page_list_element(response);
            add_pages_visited.insertAdjacentHTML(
                "afterbegin", page_visited_row); //afterbegin prepends it, beforeend appends

        }).catch( error => {
            //TODO put something on the page that says a page result failed to register
            console.log("THERE WAS AN ERROR SHOWING A PAGE!!!");
        });
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
    chrome.runtime.sendMessage({
        "type": "stop_session",
        "stop_time": stop_time.getTime(),
    }, response => {
        window.onbeforeunload = null;
        //media.stop_recording();
        window.location = "/html/enter_topic.html";
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
    var inputVideo = document.getElementById("inputVideo");
    inputVideo.addEventListener("play", onPlay);

    chrome.storage.sync.get(["session_id", "start_time", "user_name", "user_id", "description", "keywords"], result => {
        //Check that everything is OK
        if(!result || !result.session_id || !result.user_name){
           console.error("THERE WAS SOMETHING WRONG WITH SAVING THE SESSION"); 
        }
        
        let keywords_list = result.keywords.split("~").filter(el => el.length > 0).map(el => escape_for_display(el));
        let keywords_tags = `
                ${keywords_list.map( keyword => ` 
                    <div class="col-4 keyword_list_item">
                        ${keyword}
                    </div>
                `).join('')}
        `

        document.getElementById("populate_keywords").innerHTML = keywords_tags;
        document.getElementById("populate_description").innerText = result.description;
        
        // calculate how much time is left in the session
        let start_time = new Date(result.start_time)
        function get_timer(){
            let diff = new Date() - start_time; 
            let mins = Math.floor((diff/1000) / 60); 
            let hours = Math.floor(mins / 60); 
            let secs = Math.floor((diff/1000) % 60); 
            if(secs < 10){secs = "0" + secs;}
            if(mins < 10){mins = "0" + mins;}
            if(hours < 10){hours = "0" + hours;}
            return `${hours}:${mins}:${secs}`;
        }
        
        //Update the clock every second using the above calculations
        setInterval(function(){document.getElementById("populate_countdown_clock").innerText = get_timer();}, 1000)
    });
}
