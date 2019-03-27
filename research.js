/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since March 2019
 */
"use strict";
//import { media } from "./mediaLib.js";
import { show_relevant_keywords, keyword_click, keyword_cancel_click } from "./keywords.js";
import { make_transitional } from "./transitional.js";
import { globals } from "./globals.js";

// ------------------------------------------
// Routing
// -------------------------------------------------

let session_id;
let description;
let end_time;
let user_id;
let session_end_timer;
let distraction_counter = 0;
let distraction_threshold = 3;

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
            show_relevant_keywords(event);
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
 * If a page is relevant subtract from the counter. If it's a distraction then add to the counter.
 * It can't go below zero, nor above the threshold.
 * Once it hits the threshold then foreground the window
 */
function adjust_distraction_counter(is_relevant){
    console.log("adjust_distraction got called at " + new Date());
    //TODO check that there is an ongoing session first
    if(is_relevant && distraction_counter > 0){
        distraction_counter--;
    }else if(!is_relevant && distraction_counter < distraction_threshold){
        distraction_counter++;
        if(distraction_counter >= distraction_threshold){
            chrome.runtime.sendMessage({
                "type": "open_window"
            });
            show_distracted_overlay();
        }
    }
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
    distraction_counter--;
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
    let xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status <= 299 && !!xhr.response){
            console.log("xhr ready state was 200 with a response at " + new Date());
            const time_loaded = new Date().getTime();

            console.log(xhr.response);
            if(!xhr.is_transitional){
                adjust_distraction_counter(xhr.response.is_relevant);
            }

            let add_pages_visited = document.querySelector("#add_pages_visited");
            if(!!add_pages_visited.firstElementChild){
                let time_div = add_pages_visited.firstElementChild.getElementsByClassName("populate_time_spent")[0];
                let previous_time = time_div.getAttribute("time_loaded");
                let time_delta = (time_loaded - Number(previous_time))/1000;
                let time_delta_mins = Math.floor(time_delta/60);
                let time_delta_secs = Math.floor(time_delta%60);
                if(time_delta_secs < 10){
                    time_delta_secs = "0" + time_delta_secs;
                }
                let display_time = `${time_delta_mins}:${time_delta_secs}`;
                time_div.innerText = display_time;
            }


            const page_id = xhr.response.page_id;
            const keywords = xhr.response.keywords;

            let yes_class = (!xhr.response.is_transitional & xhr.response.is_relevant) ? 'btn-success' : 'btn-light';
            let mr_class = (!xhr.response.is_transitional & !xhr.response.is_relevant) ? 'make_relevant_button' : '';
            let mt_class = (!xhr.response.is_transitional & !xhr.response.is_relevant) ? 'make_relevant_button' : ''; //TODO add this to the transitional button bellow
            let no_class = (!xhr.response.is_transitional & !xhr.response.is_relevant) ? 'btn-danger' : 'btn-light';
            let transit_class = xhr.response.is_transitional ? 'btn-secondary' : 'btn-light';
            let page_visited_template = `
                    <div class="row page_list_item" page_id="${page_id}">
                        <div class="col-2 populate_time_spent" time_loaded="${time_loaded}">
                            . . .
                        </div>
                        <div class="col-7 row">
                            ${msg.doc_title}
                        </div>
                        <button class="span-1 btn ${yes_class} ${mr_class}"
                                page_id="${page_id}"
                                noun_keywords="${keywords}">
                            Yes
                        </button>
                        <button class="span-1 btn ${no_class}" disabled>
                            No
                        </button>
                        <button class="span-1 btn ${transit_class}" disabled>
                            Transit
                        </button>
                    </div>
                `
            
            add_pages_visited.insertAdjacentHTML(
                "afterbegin", page_visited_template); //afterbegin prepends it, beforeend appends
        }
    }

    chrome.storage.sync.get(["session_id", "end_time", "user_id"], results => {
        if(!results || !results.session_id){
            throw new Exception("There is no session ID but we called STOP on it");
        }
        pkg["session_id"] = results.session_id;
        xhr.open("POST", `${globals.api_url}/pages/`)
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
    chrome.runtime.sendMessage({
        "type": "stop_session",
        "stop_time": stop_time.getTime(),
    }, response => {
        window.onbeforeunload = null;
        //media.stop_recording();
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
    var inputVideo = document.getElementById("inputVideo");
    inputVideo.addEventListener("play", onPlay);

    chrome.storage.sync.get(["session_id", "end_time", "user_name", "user_id", "description", "keywords"], result => {
        //Check that everything is OK
        if(!result || !result.session_id || !result.user_name || new Date() > new Date(result.end_time)){
           console.error("THERE WAS SOMETHING WRONG WITH SAVING THE SESSION"); 
        }
        
        let keywords_list = result.keywords.split("~").filter(el => el.length > 0);
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
        let duration = end_time - new Date(); 
        session_end_timer = setTimeout(function(){
            chrome.runtime.sendMessage({"type": "end_session"});
            chrome.storage.sync.set({
                "session_id": null,
                "description": null, 
                "keywords": null,
                "end_time": null
            });
            window.onbeforeunload = null;
            window.location = "enter_topic.html";
        }, duration);
    });
}
