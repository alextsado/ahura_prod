/**
 * Handle user name collection when a user first logs in
 *
 * TODO only import this if it's necessary, otherwise if a user has their name then 
 * don't bother importint it. That may keep the app running a little faster.
 *
 * @Author Barnaby B.
 * @Since Nov 9, 2018
 */

import { globals } from "./globals.js";

/*
 * Set up event listeners
 */
window.onload = function(){
    fetch(`${globals.api_url}/ping-when-plugin-opened/`, {method: "get"})
    document.querySelector("#user_name_submit").addEventListener("click",
        event =>  user_name_click(event));
}


/*
 * Prevent the user from closing the window by accident 
 * if they have a session going on
 */
window.onbeforeunload = null;

/*
 * AJAX call to set the users' name and to get an id from the server
 * @Param the users name
 * @TODO validate that the users name is appropriate
 * @Returns a promise with success returning the users ID and the catch() has the error status
 */
function set_user_name_get_user_id(user_name){
    return new Promise((resolve, reject) => {
        fetch(`${globals.api_url}/users/`, {
            method: 'post',
            body: JSON.stringify({
                "user_name": user_name,
                "password": "VH2Cjg'mme=>U[UG"}),
            headers: {
                "Content-type": "application/json;charset=UTF-8"
            }
        }).then(response => {
            console.log("got a response");
            if(response.ok){
                return response.json();
            }
        }).then( response => {
            console.log("response is ", response);
            chrome.storage.sync.set({
                "user_name": user_name,
                "user_id": response.user_id
            });
            resolve(response.user_id);
        }).catch( err => {
            reject(err);
        });
    });
}

/*
 * Handle the user clicking on the submission form
 * TODO should this be a form submission capture rather than a button click?
 */
export function user_name_click(){
    create_topic_submission_spinner();
    let user_name = document.querySelector("#user_name_input").value;
    if(user_name.length <= 1){ //ask again
        console.log("No username");
        document.querySelector("#user_name_input").focus();
        document.querySelector("#user_name_input").style.border = "2px solid red";
        document.querySelector("#error_content").style.display = "block";

        let topic_submission_spinner = document.querySelector("#topic_submission_spinner");
        topic_submission_spinner.parentNode.removeChild(topic_submission_spinner);
        //document.querySelector("#user_name_submit").append("Please fill in a name and resubmit.");
    }else{ //username is good
        console.log("username is ", user_name);
        set_user_name_get_user_id(user_name).then( user_id => {
            window.location = "enter_topic.html";
        }).catch( err => {
            console.log(err);
            //TODO something on the UI to show that the AJAX call failed
        });
    }
}




/*
 * Put a spinner on top of the submission form
 */
function create_topic_submission_spinner(){
    let topic_submission_form = document.getElementById("collection_content");
    //let my_rect = topic_submission_form.getBoundingClientRect();
    let spinner = document.createElement("img");
    spinner.setAttribute("src", "images/spinner.gif");
    spinner.setAttribute("id", "topic_submission_spinner");
    spinner.style.position = "absolute";
    spinner.style.top = "100px";// my_rect.x;
    spinner.style.left = "190px";//my_rect.y;
    spinner.style.width = "150px";
    document.querySelector("#collection_content").append(spinner);
}
