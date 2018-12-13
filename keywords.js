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
 */
export function show_relevant_keywords(event){
    let button_pressed = event.target;
    let keywords = button_pressed.getAttribute("noun_keywords");
    let instruction_div = document.createElement("div");
    instruction_div.append("Select which of these keywords make it relevant:");
    button_pressed.parentNode.append(instruction_div);


    let keywords_list = keywords.split("~");
    let keywords_unordered_list = document.createElement("ul");
    var x;
    for(x in keywords_list){
        let keyword_list_item = document.createElement("li");
        let keyword_link = document.createElement("a");
        keyword_link.append(keywords_list[x]);
        keyword_link.setAttribute("href", "#");
        keyword_link.classList.add("keyword_link");
        //keyword_link.addEventListener("click", keyword_click);
        keyword_list_item.append(keyword_link);
        keywords_unordered_list.append(keyword_list_item);
    }
    button_pressed.parentNode.append(keywords_unordered_list);

    //TODO make a cancel button that deletes this list
    return false;
}


/*
 * TODO get the page ID from the link data, not the session id from the stored information
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

