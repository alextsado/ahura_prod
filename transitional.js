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
    const button_pressed = event.target;
    const pli = button_pressed.closest(".page_list_item")
    const page_id = pli.getAttribute("page_id")

    fetch("http://13.59.94.191/pages/${page_id}/", {
            method: "post",
            body: JSON.stringify({
                "is_transitional": true
            }),
            headers: {
                "Content-type": "application/json;charset=UTF-8"
            }
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
    let page_link = button_pressed.closest(".page_list_item");
    let plad = page_link.querySelector(".page_list_buttons_div");
    plad.parentNode.removeChild(plad);
    page_link.classList.remove("alert-warning");
    page_link.classList.add("alert-dark");
}

/*
 * Put a note that something went wrong and they should try clicking again
 */
function show_error_occured(button_pressed){
    throw new Exception("not implemented yet");
}

