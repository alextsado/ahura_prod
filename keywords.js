/**
 * Handle keyword click functionality.
 *
 * TODO only import this once session functionality starts to improve initial load.
 * @Author Barnaby B.
 * @Since Dec 9, 2018
 */

import { globals } from "./globals.js";

/*
 * Clicking on a 'make relevant' link shows the list of keywords
 * each of which when clicked triggers an event to add them to the session.
 * disable the 'make relevant button'
 *
 */
export function show_relevant_keywords(event){
    let button_pressed = event.target;
    let keywords = button_pressed.getAttribute("noun_keywords");
    let rand_id = button_pressed.getAttribute("id");
    button_pressed.classList.add("isDisabled");
    let keywords_list = keywords.split("~");


    let instruction_div = `
        <div class="keyword_wrapper">
            <hr style="width: 100%" />
            <div class="row">
              Select which of these keywords make it relevant:
            </div>
            <div class="row">
                ${keywords_list.map( keyword => ` 
                    <div class="col-6">
                        <a href="#" class="keyword_link">
                            ${keyword}
                        </a>
                    </div>
                `).join('')}
            </div>
            <div class="row">
                <button type="button" rand_id="${rand_id}" class="btn btn-secondary cancel_button">Cancel</button>
            </div>
        </div>
    `
    button_pressed.parentNode.insertAdjacentHTML('afterend', instruction_div);
    return false;
}

/*
 * Remove the whole added list of keywords after the cancel button is clicked.
 * re-enable the 'make-relevant' button.
 */
export function keyword_cancel_click(event){
    let cancel_button = event.target;
    let rand_id = cancel_button.getAttribute("rand_id");
    document.getElementById(rand_id).classList.remove("isDisabled");
    cancel_button.closest(".keyword_wrapper").remove();
}

/*
 * TODO get the page ID from the link data, not the session id from the stored information
 * TODO use fetch instead of xhr
 *
 * Clicking on a keyword sends an ajax request to make the page legit.
 */
export function keyword_click(event){
    let keyword_link = event.target;
    let new_keyword = keyword_link.innerText;
    let page_id = keyword_link.closest(".page_list_item").getAttribute("page_id");
    console.log("keyword clicked: " + new_keyword);
    console.log("page_id: " + page_id);
    let pkg = {"new_keyword": new_keyword, "is_relevant": true}

    let xhr = new XMLHttpRequest();
    xhr.open("POST", `${globals.api_url}/pages/${page_id}/`);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.responseType = "json";

    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status <= 299){
            let page_link = keyword_link.closest(".page_list_item");
            let plad = page_link.querySelector(".page_list_buttons_div");
            plad.parentNode.removeChild(plad);
            page_link.classList.remove("alert-warning");
            page_link.classList.add("alert-success");
            let del_me = keyword_link.closest(".keyword_wrapper");
            del_me.parentNode.removeChild(del_me);
        }//TODO should handle failure?
    }
    xhr.send(JSON.stringify(pkg));

    return false;
}
