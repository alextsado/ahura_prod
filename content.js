/**
 * Whenever a new page loads send the first 500 words of content to the
 * background page.
 *
 * @Author Barnaby B.
 * @Since Nov 12, 2018
 */
let load_time = new Date();
/* Don't do anything unless the user specifically said they're in 
 * a pomodoro study session right now 
 */
chrome.storage.sync.get(["end_time", "session_id"], results => {
    if(!!results && !!results.session_id && !!results.end_time){
        if(new Date() < new Date(results.end_time)){
            ahura_go(results);
        }
    }
});

/*
 * Collect the first couple hundred characters of text to be
 * analyzed for relevance
 */
function ahura_go(results){
    let content_start, first_h1, first_h2, doc_body, first_500;
    if(!!document.querySelector("h1")){
        first_h1 = document.querySelector("h1").innerText;
    }
    if(!!document.querySelector("h2")){
        first_h2 = document.querySelector("h2").innerText;
    }
    if(!!document.querySelector("body")){
        doc_body = document.querySelector("body").innerText;
    }

    if(!!doc_body){
        if(!first_h1 && ! first_h2){
            content_start = 0;
        }else if(!!first_h1 && !first_h2){
            content_start = doc_body.indexOf(first_h1);
        }else if(!first_h1 && !!first_h2){
            content_start = doc_body.indexOf(first_h2);
        }else{
            let pos_first_h1 = doc_body.indexOf(first_h1);
            let pos_first_h2 = doc_body.indexOf(first_h2);
            if(pos_first_h1 <= pos_first_h2){
                content_start = pos_first_h1;
            }else if(pos_first_h2 < pos_first_h1){
                content_start = pos_first_h2;
            }else{
                //TODO report this error to the API
                console.error("Unexpectedly there is an H1 and an H2 but neither one is positioned less than the other one.");
            }
        }
        first_500 = doc_body.substr(content_start, content_start + 700);
    }else{
        first_500 = "";
    }
    chrome.runtime.sendMessage({
        type: "summary_text",
        session_id: results.session_id,
        message: first_500,
        load_time: load_time.getTime()
    });
}
