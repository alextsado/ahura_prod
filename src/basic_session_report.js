import { globals } from "./globals.js";

/*
 * Given a total number of seconds, convert it to a displayable string
 */
function convert_seconds_to_display(raw_seconds){
    let display_hours = Math.round(raw_seconds / 3600);
    display_hours = display_hours < 10 ? "0" + display_hours : display_hours;
    let display_minutes = Math.round(raw_seconds / 60) % 60;
    display_minutes = display_minutes < 10 ? "0"+display_minutes : display_minutes;
    let display_seconds = raw_seconds % 60;
    display_seconds = display_seconds < 10 ? "0"+display_seconds : display_seconds;
    return `${display_hours}:${display_minutes}:${display_seconds}`;
}

/*
 * Fill in the chart with all of the statistics about this session
 */
function fill_in_stats(response){
    let total_session_time = convert_seconds_to_display(response.total_session_time_seconds);
    let relevant_time_sum = convert_seconds_to_display(response.relevant_time_sum_seconds);
    document.getElementById("total_session_time").innerText = total_session_time;
    document.getElementById("relevant_time_sum").innerText = relevant_time_sum;
    document.getElementById("relevant_time_percentage").innerText = response.relevant_time_percentage;
    document.getElementById("relevant_page_count").innerText = response.relevant_page_count;

    let search_time_sum = convert_seconds_to_display(response.search_time_sum_seconds);
    document.getElementById("total_session_time").innerText = total_session_time;
    document.getElementById("search_time_sum").innerText = search_time_sum;
    document.getElementById("search_time_percentage").innerText = response.search_time_percentage;
    document.getElementById("search_page_count").innerText = response.search_page_count;
}

/*
 * Populate the list of URLs that were useful in this session.
 */
function fill_in_url_list(response){
    response.relevant_urls.forEach( _url => {
        let relevant_url_row = `
            <div class="col-12">
                <a href="${_url}" target="_blank">${_url}</a>
            </div>
            `;
       document.getElementById("relevant_urls").insertAdjacentHTML(
                "afterbegin", relevant_url_row);  
    });
}

window.onload = function(){
    console.log("Starting script");
    fetch(`${globals.api_url}/sessions/bb1ab2b2-6088-11e9-a23b-0291b9caeffe/basic-report/`).then( response => {
        if(response.ok){
            return response.json();
        }else{
            throw new Error("Problem encountered on the server");
        }
    }).then( response => {
        console.log(response);
        fill_in_stats(response);
        fill_in_url_list(response);
    }).catch( error => {
        console.log(error);
    });
}
