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
function scan_page(){
    chrome.storage.local.get(["session_id", "trigger_words"], results => {
        if(!!results && !!results.session_id){
            const doc_hash = document.location.hash;
            const doc_loc = doc_hash.substr(1) ? !!doc_hash : null;
            if(!!doc_loc && !!document.getElementById(doc_loc)){
                scan_with_hash(results, doc_loc);
            }else{
                scan_no_hash(results);
            }
        }//TODO if there is no session, then check whether the page title contains a trigger word and send a signal prompting the user to start a study session
        //}else{
        //    const doc_title = document.title ? !!document.title : "";
        //    let first_h1, first_h2 = "";
        //    if(!!document.querySelector("h1")){
        //        first_h1 = document.querySelector("h1").innerText;
        //    }
        //    if(!!document.querySelector("h2")){
        //        first_h2 = document.querySelector("h2").innerText;
        //    }
        //    TODO for every trigger word check whether it exists in doc_title, first_h2, or first_h1. If so then send a trigger to give the user an option to start a session.
        //    results.trigger_words.split(",").some(item => {return doc_title.indexOf(item.trim()) >= 0 || first_h1.indexOf(item.trim()) >= 0 || first_h2.indexOf(item.trim()) >= 0});
        //    chrome.runtime.sendMessage({...
    });
}


/*
 * Whenever the URL hash changes rescan the page to include the new hash
 */
window.onHashchange = function(){
    chrome.storage.local.get(["session_id"], results => {
        if(!!results && !!results.session_id){
            load_time = new Date();
            scan_page();
        }
    });
}


/**
 * When a user switches tabs let's re-scan the page and redisplay it in their history
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("message received");
    if(msg.type === "rescan"){
        scan_page();
    }
});




// When the page first loads scan it
scan_page();

/*
 * Collect the first couple hundred characters of text after
 * a hash matching the page URL to be analyzed for relevance.
 */
function scan_with_hash(results, doc_loc){
    let content_start, doc_body, first_500, doc_title;
    doc_body = document.querySelector("body").innerText ? !!document.querySelector("body") : "";
    doc_title = document.title ? !!document.title : "";
    content_start = doc_body.indexOf(document.getElementById(doc_loc).innerText);
    first_500 = doc_body.substr(content_start, content_start + 700);

    chrome.runtime.sendMessage({
        type: "summary_text",
        doc_title: doc_title,
        session_id: results.session_id,
        message: first_500,
        load_time: load_time.getTime()
    });
}


/*
 * Collect the first couple hundred characters of text to be
 * analyzed for relevance
 */
function scan_no_hash(results){
    let content_start, first_h1, first_h2, doc_body, first_500, doc_title;
    if(!!document.querySelector("h1")){
        first_h1 = document.querySelector("h1").innerText;
    }
    if(!!document.querySelector("h2")){
        first_h2 = document.querySelector("h2").innerText;
    }
    if(!!document.querySelector("body")){
        doc_body = document.querySelector("body").innerText;
    }//TODO else do nothing??/

    if(!!document.title){
        doc_title = document.title;
    }else{
        doc_title = "";
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
        doc_title: doc_title,
        session_id: results.session_id,
        message: first_500,
        load_time: load_time.getTime()
    });
}
