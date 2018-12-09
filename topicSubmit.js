/**
 * Handle the submission of a new topic inside of the window
 *
 * TODO move the fetch() call from background.js into here. Further refactor it. :-)
 *
 * @Author Barnaby B.
 * @Since Nov 9, 2018
 */

/*
 * When a user clicks the submit button to start a new session
 */
export function submit_button_click(event, callback){
    console.log(callback);
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
                //is_ongoing_session = true;
                callback();
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
