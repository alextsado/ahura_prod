/**
 * Handle user name collection when a user first logs in
 *
 * TODO only import this if it's necessary, otherwise if a user has their name then 
 * don't bother importint it. That may keep the app running a little faster.
 *
 * @Author Barnaby B.
 * @Since Nov 9, 2018
 */

import { media } from "./mediaLib.js";

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
            console.log("got a response");
            if(response.ok){
                return response.json();
            }
        }).then( response => {
            console.log("response is ", response);
            media.user_id = response.user_id;
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
