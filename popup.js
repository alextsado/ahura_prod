/**
 * Control the popup page
 *
 * @Author Barnaby B.
 * @Since Nov 14, 2018
 */

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
