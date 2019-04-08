/**
 * Handle keyword click functionality.
 *
 * TODO only import this once session functionality starts to improve initial load.
 * @Author Barnaby B.
 * @Since March 2019
 */

import { globals } from "./globals.js";
import { escape_for_display } from "./escape_for_display.js";

/*
 * Clicking on a 'make relevant' link shows the list of keywords
 * each of which when clicked triggers an event to add them to the session.
 * disable the 'make relevant button'
 *
 */
export function show_relevant_keywords(event){
    let button_pressed = event.target;
    let keywords = button_pressed.getAttribute("noun_keywords");
    //button_pressed.classList.add("isDisabled");
    let keywords_list = keywords.split("~").filter(el => el.length > 0).map(el => escape_for_display(el));
    let page_id = button_pressed.getAttribute("page_id");


    let instruction_div = `
            ${keywords_list.map( keyword => ` 
                <div class="col-4">
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
    console.log("keyword clicked: " + new_keyword);
    console.log("page_id: " + page_id);
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
            //TODO add the new keyword into the sync.set({'keywords': new_keyword + existing_keywords})
            document.getElementById("overlay_bg").style.display = "none";
            document.getElementById("away_from_computer_overlay_content").style.display = "none";
            document.getElementById("populate_make_relevant").innerHTML = "";
            console.log("Successfully added a keyword");
        }  
    }, function(error) {
        console.log(error.message); //=> String
    })

    return false;
}
