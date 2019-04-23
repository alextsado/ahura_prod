/**
 * Handle keyword click functionality.
 *
 * TODO only import this once session functionality starts to improve initial load.
 * @Author Barnaby B.
 * @Since March 2019
 */

import { globals } from "./globals.js";
import { show_distracted_overlay } from "./research.js";
import { escape_for_display } from "./escape_for_display.js";

/*
 * Clicking on a 'make relevant' link shows the list of keywords
 * each of which when clicked triggers an event to add them to the session.
 * disable the 'make relevant button'
 *
 * @param the button that was pressed
 */
export function show_relevant_keywords(button_pressed){
    let keywords = button_pressed.getAttribute("noun_keywords");
    //button_pressed.classList.add("isDisabled");
    let keywords_list = keywords.split("~").filter(el => el.length > 0).map(el => escape_for_display(el));
    let page_id = button_pressed.getAttribute("page_id");

    let instruction_div = `
            ${keywords_list.map( keyword => ` 
                <div class="col-4 no_overflow">
                    <a href="#" class="keyword_link" page_id="${page_id}">
                        ${keyword}
                    </a>
                </div>
            `).join('')}
        </div>
    `
    document.getElementById("overlay_bg").style.display = "block";
    document.getElementById("relevant_overlay_content").style.display = "block";
    document.getElementById("populate_make_relevant").insertAdjacentHTML('beforeend', instruction_div);
    return false;
}

/*
 * Remove the whole added list of keywords after the cancel button is clicked.
 * re-enable the 'make-relevant' button.
 *
 * @TODO is this still using jQuery??? EDIT THIS!!
 */
export function keyword_cancel_click(event){
    let cancel_button = event.target;
    cancel_button.closest(".keyword_wrapper").remove();
}

/*
 * TODO get the page ID from the link data, not the session id from the stored information
 *
 * Clicking on a keyword sends an ajax request to make the page legit.
 */
export function keyword_click(event){
    let keyword_link = event.target;
    let new_keyword = keyword_link.innerText;
    let page_id = keyword_link.getAttribute("page_id");
    let pkg = {"new_keyword": new_keyword, "is_relevant": true}

    fetch(`${globals.api_url}/pages/${page_id}/`, {
        method: "POST",
        body: JSON.stringify(pkg),
        headers: {
        "Content-Type": "application/json"
        },
        credentials: "same-origin"
    }).then(function(response) {
        if (response.status <= 299) {
            let keyword_tag = `
                    <div class="col-4 keyword_list_item">
                        ${new_keyword}
                    </div>
            `
            document.getElementById("populate_keywords").insertAdjacentHTML("afterbegin", keyword_tag);

            //TODO change the status of the link to "relevant"

            let page_row = document.querySelector(`div.page_list_item[page_id="${page_id}"]`);
            let doc_title = page_row.querySelector(".page_list_title").innerText;
            let page_keywords = page_row.querySelector(".make_relevant_button").getAttribute("noun_keywords");
            let temp_response = {"page_id": page_id, "keywords": page_keywords,
                "is_transitional": false, "is_relevant": true, "doc_title": doc_title}
            let replacement_page_row = get_page_list_element(temp_response);
            page_row.insertAdjacentHTML("afterend", replacement_page_row);
            page_row.parentNode.removeChild(page_row);

            //TODO do this by finding the element with page_id=page_id  class=page_list_item
            //TODO add the new keyword into the sync.set({'keywords': new_keyword + existing_keywords})

            //close the overlay and clear its contents
            document.getElementById("overlay_bg").style.display = "none";
            document.getElementById("away_from_computer_overlay_content").style.display = "none";
            document.getElementById("populate_make_relevant").innerHTML = "";
        }  
    }, function(error) {
        console.log(error.message); //=> String
    })

    return false;
}


/*
 * Given a server response, or a properly-gathered information object
 * return an HTML element representing an individual row
 *
 * @param response.is_transitional - whether this page was a search page
 * @param response.is_relevant - whether the page was relevant
 * @param response.page_id - the id of this page in this session in the database
 * @param response.keywords - the keywords found in this page, separated by a ~
 * @param response.doc_title - the title of the page
 */
export function get_page_list_element(response){
    const time_loaded = new Date().getTime();

    console.log(response);
    if(!response.is_transitional){
        adjust_distraction_counter(response.is_relevant);
    }

    let add_pages_visited = document.querySelector("#add_pages_visited");
    let first_child = add_pages_visited.firstElementChild;
    if(!!first_child && first_child.classList.contains("page_list_item")){
        let time_div = first_child.getElementsByClassName("populate_time_spent")[0];
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


    const page_id = escape_for_display(response.page_id);
    const keywords = escape_for_display(response.keywords);
    const doc_title = escape_for_display(response.doc_title);

    let yes_class = (!response.is_transitional & response.is_relevant) ? 'btn-success' : 'btn-light';
    let mr_class = (!response.is_transitional & !response.is_relevant) ? 'make_relevant_button' : '';
    let mt_class = (!response.is_transitional & !response.is_relevant) ? 'make_relevant_button' : ''; //TODO add this to the transitional button bellow
    let no_class = (!response.is_transitional & !response.is_relevant) ? 'btn-danger' : 'btn-light';
    let transit_class = response.is_transitional ? 'btn-secondary' : 'btn-light';
    try{
        return `
            <div class="row page_list_item" page_id="${page_id}">
                <div class="col-2 populate_time_spent" time_loaded="${time_loaded}">
                . . .
                </div>
                <div class="col-7 row page_list_title" style="overflow: hidden; white-space: nowrap;">
                    ${doc_title}
                </div>
                <button class="col-1 btn ${yes_class} ${mr_class}"
                    page_id="${page_id}"
                    noun_keywords="${keywords}">
                        ${ response.is_relevant ? '': '<span class="mytooltip">' }
                        Yes
                        ${ response.is_relevant ? '': '<span class="mytooltiptext">Change this page to relevant.</span> </span>' }
                </button>
                <button class="col-1 btn ${no_class}" disabled>
                    No
                </button>
                <button class="col-1 btn ${transit_class}" disabled>
                    Transit
                </button>
            </div>
            `
    }catch(e){
        console.log("unable to render");
        return '<div class="row">Unable to render this page</div>';
    }
}


/**
 * If a page is relevant subtract from the counter. If it's a distraction then add to the counter.
 * It can't go below zero, nor above the threshold.
 * Once it hits the threshold then foreground the window
 */
function adjust_distraction_counter(is_relevant){
    console.log("adjust_distraction got called at " + new Date());
    //TODO check that there is an ongoing session first
    if(is_relevant && globals.distraction_counter > 0){
        globals.distraction_counter--;
    }else if(!is_relevant && globals.distraction_counter < globals.distraction_threshold){
        globals.distraction_counter++;
        if(globals.distraction_counter >= globals.distraction_threshold){
            chrome.runtime.sendMessage({
                "type": "open_window"
            });
            show_distracted_overlay();
        }
    }
}
