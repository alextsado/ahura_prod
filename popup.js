/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */

/*
 * Route any messages relevant to the functionality of the window
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //Message from a newly loaded page
    if(msg.type === "summary-text"){
        summary_text(msg, sender, sendResponse);   
    }
});

/*
 * TODO get the page ID from the link data, not the session id from the stored information
 *
 * Clickingo n a keyword sends an ajax request to make the page legit.
 */
function keyword_click(event){
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
            let del_me = keyword_link.closes("make_relevant_content");
            del_me.parentNode.style.color = green;
            del_me.parentNode.removeChild(del_me);
        }
    }
    xhr.send(JSON.stringify(pkg));


    return false;
}

/*
 * Clicking on a 'make relevant' link shows the list of keywords
 * each of which when clicked triggers an event to add them to the session.
 */
function show_relevant_keywords(event){
    let button_pressed = event.target;
    let keywords = button_pressed.getAttribute("noun_keywords");
    let instruction_div = document.createElement("div");
    instruction_div.append("Select which of these keywords make it relevant:");
    button_pressed.parentNode.append(instruction_div);


    let keywords_list = keywords.split("~");
    let keywords_unordered_list = document.createElement("ul");
    for(x in keywords_list){
        let keyword_list_item = document.createElement("li");
        let keyword_link = document.createElement("a");
        keyword_link.append(keywords_list[x]);
        keyword_link.setAttribute("href", "#");
        keyword_link.addEventListener("click", keyword_click);
        keyword_list_item.append(keyword_link);
        keywords_unordered_list.append(keyword_list_item);
    }
    button_pressed.parentNode.append(keywords_unordered_list);

    //TODO make a cancel button that deletes this list
    return false;
}

/*
 * Handle a summary text  message from the content page
 */
function summary_text(msg, sender, sendResponse){
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
            if(xhr.response.is_relevant){
                page_visited.style.color = "green";
            }else{
                page_visited.style.color = "red";
                //TODO add a list of keywords that would make this relevant
                let parent_div = document.createElement("div");
                parent_div.classList.add("make_relevant_content");
                let make_relevant_button = document.createElement("a");
                make_relevant_button.setAttribute("href", "#");
                make_relevant_button.append("Make relevant");
                make_relevant_button.setAttribute("noun_keywords", xhr.response.keywords);
                make_relevant_button.addEventListener("click", show_relevant_keywords);
                parent_div.append(make_relevant_button);
                page_visited.append(parent_div);


                //TODO make a TRANSITIONAL PAGE button as well.
            }
            document.querySelector("#add_pages_visited").append(page_visited);
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

/*
 * Put a spinner on top of the submission form
 */
function create_topic_submission_spinner(){
    console.log("creating the topic submission_spinner");
    let topic_submission_form = document.getElementById("collection_content");
    let my_rect = topic_submission_form.getBoundingClientRect();
    let spinner = document.createElement("img");
    spinner.setAttribute("src", "spinner.gif");
    spinner.setAttribute("id", "topic_submission_spinner");
    spinner.style.position = "absolute";
    spinner.style.top = my_rect.x;
    spinner.style.left = my_rect.y;
    spinner.style.width = "150px";
    document.querySelector("body").append(spinner);
}

/*
 * Prevent the user from inadvertantly closing the window
 */
let is_ongoing_session = false;


window.onbeforeunload = function(){
    //TODO put a message into the chat area since it probably won't show up in the popup;
    if(is_ongoing_session){
        return "Closing this window will end your study session";
    }
};

window.onload = function(){
    //If there's an ongoing study session then show the ongoing dialog
    chrome.storage.sync.get("end_time", result => {
        if(new Date() < new Date(result.end_time)){
            document.querySelector("#ongoing_study").style.visibility = "visible";
            document.querySelector("#collection_content").style.visibility = "hidden";
        }
    });

    /*
     * When a user clicks the submit button then get the values, make sure they're not empty
     * and send a message to the background so that it can start the session and everything.
     */
    document.querySelector("#submit_button").addEventListener("click", event => {
        let time_started = new Date();
        let description = document.querySelector("[name=description]").value
        let additional_keywords = document.querySelector(
            "[name=additional_keywords]").value;
        let duration = document.querySelector("[name=duration]").value;
        if(!!description){
            create_topic_submission_spinner();
            chrome.runtime.sendMessage({
                "type": "topic-submit",
                "description": description + " . " + additional_keywords,
                'additional_keywords': additional_keywords,
                'duration': duration,
                'time_started': time_started.getTime()
            }, function(response){
                console.log("success! " + new Date().getTime());
                console.log(response);
                if(!!response && !!response.success){
                    is_ongoing_session = true;
                    document.querySelector("#ongoing_study")
                        .style.visibility = "visible";
                    document.querySelector("#collection_content")
                        .style.visibility = "hidden";
                    let topic_submission_spinner = document.querySelector("#topic_submission_spinner");
                    if(!!topic_submission_spinner){
                        topic_submission_spinner.parentNode.removeChild(topic_submission_spinner);
                    }
                }else{
                    if(!!response && !!response.error){
                        document.querySelector("#error_content").innerText = response.error;
                        document.querySelector("#error_content").style.visibility = "visible";
                    }else{
                        document.querySelector("#error_content").innerText = "Unkown Error";
                        document.querySelector("#error_content").style.visibility = "visible";
                    }
                }
                return true;
            })
        }else{
            console.log("errors");
            document.querySelector("#error_content")
                .innerText = "Please fill out both form fields";
            document.querySelector("#error_content").style.visibility = "visible";
        }
    });

    /**
     * Clicking the "complete session" button makes the session end.
     * No more sending things and the user is able to start a new session.
     *
     * TODO add   media_recorder.stop();
     */
     document.querySelector("#stop_session").addEventListener("click", event => {
         let stop_time = new Date();
         //TODO add a spinner?
         chrome.runtime.sendMessage({
             "type": "stop_session",
             "stop_time": stop_time.getTime(),
         }, response => {
            if(!!response && !!response.success){
                is_ongoing_session = false;
                document.querySelector("#ongoing_study").style.visibility = "hidden";
                document.querySelector("#collection_content").style.visibility = "visible";
            }else{
                console.log("errors");
                document.querySelector("#error_content")
                    .innerText = "There was an error in closing this session";
                document.querySelector("#error_content").style.visibility = "visible";
            }
             return true;
         });
     });
}
