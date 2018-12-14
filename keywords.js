/**
 * Handle keyword click functionality.
 *
 * TODO only import this once session functionality starts to improve initial load.
 * @Author Barnaby B.
 * @Since Dec 9, 2018
 */

/*
 * Clicking on a 'make relevant' link shows the list of keywords
 * each of which when clicked triggers an event to add them to the session.
 *
 * TODO make a cancel button that deletes this list from the page
 */
export function show_relevant_keywords(event){
    let button_pressed = event.target;
    let keywords = button_pressed.getAttribute("noun_keywords");
    let keywords_list = keywords.split("~");


    let instruction_div = `
        <div class="keyword_wrapper">
            <div class="row">
                <div class="col">
                  Select which of these keywords make it relevant:
                </div>
                <div class="col">
                    <button type="button" class="btn btn-secondary cancel_button">Cancel</button>
                </div>
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
        </div>
    `
    button_pressed.parentNode.insertAdjacentHTML('afterend', instruction_div);
    return false;
}

/*
 * Remove the whole added list of keywords after the cancel button is clicked.
 */
export function keyword_cancel_click(event){
    let cancel_button = event.target;
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
    let page_id = keyword_link.closest(".page_history").getAttribute("page_id");
    console.log("keyword clicked: " + new_keyword);
    console.log("page_id: " + page_id);
    let pkg = {"new_keyword": new_keyword}

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "http://13.59.94.191/pages/" + page_id + "/");
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.responseType = "json";

    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status <= 299){
            console.log("SUCCESS");
            //TODO remove all the keywords, the link, the instructions and change the url to green 
            let del_me = keyword_link.closest(".make_relevant_content");
            del_me.parentNode.style.color = "green";
            del_me.parentNode.removeChild(del_me);
        }//TODO should handle failure?
    }
    xhr.send(JSON.stringify(pkg));

    return false;
}
