let load_time = new Date();

function scan_page() {
  chrome.storage.sync.get(['session_id'], results => {
    if (!!results && !!results.session_id) {
      let doc_hash = document.location.hash;
      let doc_loc = doc_hash.substr(1) ? !!doc_hash : null;
      if (!!doc_loc && !!document.getElementById(doc_loc)) {
        scan_with_hash(results, doc_loc);
      } else {
        scan_no_hash(results);
      }
    }
  });
}

// Whenever the URL hash changes rescan the page to include the new hash
window.onHashchange = function () {
  chrome.storage.sync.get(['session_id'], results => {
    if (!!results && !!results.session_id) {
      load_time = new Date();
      scan_page();
    }
  });
};

/* -----------------------chrome listener--------------------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('received');
  if (msg.type === 'rescan') {
    scan_page();
  }

  if (msg.type === 'page_visited') {
    const add_pages_visited = document.getElementById('ahura-extension-dom');
    add_pages_visited.insertAdjacentHTML('afterbegin', msg.data);
  }

  if (msg.type === 'distracted') {
    const mediaView = document.getElementById('ahura-media-view');
    const distractionView = document.getElementById('ahura-distraction-screen');
    const parentDiv = document.querySelector('.course-page-outer')
    if (mediaView && distractionView && parentDiv) {
      mediaView.classList.add('d-none');
      distractionView.classList.remove('d-none');
      parentDiv.classList.add('border-alternate');
    }
  }

  // if (msg.type === 'not-distracted') {
  //   const mediaView = document.getElementById('ahura-media-view');
  //   const distractionView = document.getElementById('ahura-distraction-screen');
  //   if (mediaView && distractionView) {
  //     mediaView.classList.remove('d-none');
  //     distractionView.classList.add('d-none');
  //   }
  // }
});

// When the page first loads scan it
scan_page();

/*
 * Collect the first couple hundred characters of text after
 * a hash matching the page URL to be analyzed for relevance.
 */
function scan_with_hash(results, doc_loc) {
  let content_start, doc_body, first_500, doc_title;
  doc_body = document.querySelector('body').innerText
    ? !!document.querySelector('body')
    : '';
  doc_title = document.title ? !!document.title : '';
  content_start = doc_body.indexOf(document.getElementById(doc_loc).innerText);
  first_500 = doc_body.substr(content_start, content_start + 700);
  console.log({ doc_title });
  chrome.runtime.sendMessage({
    type: 'summary_text',
    doc_title: doc_title,
    session_id: results.session_id,
    message: first_500,
    load_time: load_time.getTime(),
  });
}

/*
 * Collect the first couple hundred characters of text to be
 * analyzed for relevance
 */
function scan_no_hash(results) {
  let content_start, first_h1, first_h2, doc_body, first_500, doc_title;
  if (!!document.querySelector('h1')) {
    first_h1 = document.querySelector('h1').innerText;
  }
  if (!!document.querySelector('h2')) {
    first_h2 = document.querySelector('h2').innerText;
  }
  if (!!document.querySelector('body')) {
    doc_body = document.querySelector('body').innerText;
  } //TODO else do nothing??/

  if (!!document.title) {
    doc_title = document.title;
  } else {
    doc_title = '';
  }

  if (!!doc_body) {
    if (!first_h1 && !first_h2) {
      content_start = 0;
    } else if (!!first_h1 && !first_h2) {
      content_start = doc_body.indexOf(first_h1);
    } else if (!first_h1 && !!first_h2) {
      content_start = doc_body.indexOf(first_h2);
    } else {
      let pos_first_h1 = doc_body.indexOf(first_h1);
      let pos_first_h2 = doc_body.indexOf(first_h2);
      if (pos_first_h1 <= pos_first_h2) {
        content_start = pos_first_h1;
      } else if (pos_first_h2 < pos_first_h1) {
        content_start = pos_first_h2;
      } else {
        //TODO report this error to the API
        console.error(
          'Unexpectedly there is an H1 and an H2 but neither one is positioned less than the other one.'
        );
      }
    }
    first_500 = doc_body.substr(content_start, content_start + 700);
  } else {
    first_500 = '';
  }
  chrome.runtime.sendMessage({
    type: 'summary_text',
    doc_title: doc_title,
    session_id: results.session_id,
    message: first_500,
    load_time: load_time.getTime(),
  });
}
