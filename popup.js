/**
 * Control the popup page
 * TODO separate this into multiple files so that's it's less difficult to manage
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */

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

    document.querySelector("#user_name_submit").addEventListener("click",  event =>  user_name_click(event));
    document.querySelector("#submit_button").addEventListener("click",     event =>  submit_button_click(event));
    document.querySelector("#stop_session").addEventListener("click",      event =>  stop_session_click(event));
    //handle dynamically added elements through bubbling
    document.querySelector("#add_pages_visited").addEventListener("click", event => {
        console.log("got a click in the add_pages_visited area");
        let target = event.target;
        if(target.classList.contains("make_relevant_button")){
            console.log("routing the make_relevant button event to the appropriate function");
            show_relevant_keywords(event);
        }else if(target.classList.contains("keyword_link")){
            console.log("routing the keyword_link event to the relevant function");
            keyword_click(event);
        }
    });
}

/*
 * Prevent the user from inadvertantly closing the window.
 */
let is_ongoing_session = false;


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
            if(xhr.response.is_relevant){
                page_visited.style.color = "green";
            }else{
                page_visited.style.color = "red";
                //TODO add a list of keywords that would make this relevant
                let parent_div = document.createElement("div");
                parent_div.classList.add("make_relevant_content");
                let make_relevant_button = document.createElement("a");
                make_relevant_button.setAttribute("href", "#");
                make_relevant_button.classList.add("make_relevant_button");
                make_relevant_button.append("Make relevant");
                make_relevant_button.setAttribute("noun_keywords", xhr.response.keywords);
                //make_relevant_button.addEventListener("click", show_relevant_keywords);
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

// ---------------------------------------------------
// Event Listeners
// ------------------------------------------------

/*
 * TODO get the page ID from the link data, not the session id from the stored information
 *
 * Clicking on a keyword sends an ajax request to make the page legit.
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
            let del_me = keyword_link.closest(".make_relevant_content");
            del_me.parentNode.style.color = "green";
            del_me.parentNode.removeChild(del_me);
        }//TODO should handle failure?
    }
    xhr.send(JSON.stringify(pkg));

    return false;
}

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
 * AJAX call to set the users' name and to get an id from the server
 * @Param the users name
 * @TODO validate that the users name is appropriate
 * @Returns a promise with success returning the users ID and the catch() has the error status
 */
function set_user_name_get_user_id(user_name){
    return new Promise((resolve, reject) => {
        fetch("http://13.59.94.191/users/", {
            method: 'post',
            body: JSON.stringify({
                "user_name": user_name,
                "password": "VH2Cjg'mme=>U[UG"}),
            headers: {
                "Content-type": "application/json;charset=UTF-8"
            }
        }).then(response => {
            if(response.ok){
                chrome.storage.sync.set({
                    "user_name": user_name,
                    "user_id": response.json().user_id
                });
                resolve(response.json().user_id);
            }else{
                reject(response.statusText);
            }
        });
    });
}

/*
 * When a user clicks the submit button to start a new session
 */
function submit_button_click(){
    let time_started = new Date();
    let description = document.querySelector("[name=description]").value
    let additional_keywords = document.querySelector(
        "[name=additional_keywords]").value;
    let duration = document.querySelector("[name=duration]").value;
    if(!!description){
        create_topic_submission_spinner();
        chrome.runtime.sendMessage({
            "type": "topic_submit",
            "description": description + " . " + additional_keywords,
            'additional_keywords': additional_keywords,
            'duration': duration,
            'time_started': time_started.getTime()
        }, function(response){
            console.log("got the response");
            console.log(response);
            //Remove the spinner so it doesn't show up later;
            let topic_submission_spinner = document.querySelector("#topic_submission_spinner");
            if(!!topic_submission_spinner){
                topic_submission_spinner.parentNode.removeChild(topic_submission_spinner);
            }

            if(!!response && !!response.success){
                is_ongoing_session = true;
                document.querySelector("#ongoing_study")
                    .style.display = "contents";
                document.querySelector("#collection_content")
                    .style.display = "none";
            }else{
                if(!!response && !!response.error){
                    document.querySelector("#error_content").innerText = response.error;
                    document.querySelector("#error_content").style.display = "contents";
                }else{
                    document.querySelector("#error_content").innerText = "Unkown Error";
                    document.querySelector("#error_content").style.display = "contents";
                }
            }
            return true;
        })
    }else{
        console.log("errors");
        document.querySelector("#error_content")
            .innerText = "Please fill out both form fields";
        document.querySelector("#error_content").style.display = "contents";
    }
}

function user_name_click(){
    let user_name = document.querySelector("#user_name_input").value;
    if(user_name.length <= 1){ //ask again
        console.log("No username");
        document.querySelector("#user_name_input").focus();
        document.querySelector("#user_name_submit").append("Please fill in a name and resubmit.");
    }else{ //username is good
        console.log("username is ", user_name);
        set_user_name_get_user_id(user_name).then( user_id => {
            console.log(user_id);
            document.getElementById("user_name_form").style.display = "none";
            document.querySelector("#user_name_greeting").innerText = user_name;
            document.getElementById("greeting").style.display = "contents";
            document.getElementById("collection_content").style.display = "contents";
        }).catch( err => {
            console.log(err);
            //TODO something on the UI to show that the AJAX call failed
        });
    }
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
