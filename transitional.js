/**
 * Marking a page as transitional
 *
 * @Author Barnaby B.
 * @Since Dec 14 2018
 */

/*
 * When a user clicks the button get the page_id they're trying to change
 * to transitional. Then make an ajax call. If it's successful then
 * change the display to show the URL in gray without buttons.
 */
export function make_transitional(event){
    let button_pressed = event.target;
    let page_id = "GET THE ID"; //TODO get the page ID

    fetch("http://13.59.94.191/pages/${page_id}/", {
            method: "post"
        }).then(response => {
            console.log("RAW RESPONSE IS ", response);
            if(response.ok){
                change_link_to_transitional(button_pressed);
            }else{
                show_error_occured(button_pressed);
            }
        });
}

/*
 * Change the link to display from red to gray
 * remove both buttons.
 */
function change_link_to_transitional(button_pressed){
    throw new Exception("Not implemented yet");
}

/*
 * Put a note that something went wrong and they should try clicking again
 */
function show_error_occured(button_pressed){
    throw new Exception("not implemented yet");
}

