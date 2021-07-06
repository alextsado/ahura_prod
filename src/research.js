import {
  show_relevant_keywords,
  keyword_click,
  keyword_cancel_click,
  get_page_list_element,
} from './keywords.js';
import { escape_for_display } from './escape_for_display.js';
import { make_transitional } from './transitional.js';
import { globals } from './globals.js';

// ------------------------------------------
// Routing
// -------------------------------------------------

let session_id;
let description;
let start_time;
let user_id;
let session_timer;
let last_active_tab;

/*
 * Route any messages relevant to the functionality of the window
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  //Message from a newly loaded page
  if (msg.type === 'add-page') {
    addPageToDOM(msg, sender, sendResponse);
  }
});

/*
 * Set up event listeners
 */
window.onload = function () {
  setup_display();

  document.addEventListener('afk_event', show_away_from_computer_overlay);
  document.addEventListener('afk_return_verification', afk_return_verification);

  //handle dynamically added webpage list items through bubbling
  document
    .querySelector('#add_pages_visited')
    .addEventListener('click', event => {
      let target = event.target;
      if (target.classList.contains('make_relevant_button')) {
        show_relevant_keywords(target);
      } else if (
        target.parentElement.classList.contains('make_relevant_button')
      ) {
        show_relevant_keywords(target.parentElement);
      } else if (target.classList.contains('make_transitional_button')) {
        make_transitional(event);
      }
    });
};

function afk_return_verification() {
  console.log('received return verification');
  chrome.tabs.sendMessage(last_active_tab, {
    type: 'rescan',
  });

  // check of all items in storage to stop flooding the listener
  chrome.storage.sync.get(
    ['user_id', 'user_client_id', 'session_id', 'externalWebAppTabID'],
    results => {
      if (
        results &&
        results.session_id &&
        results.user_client_id &&
        results.user_id &&
        results.externalWebAppTabID
      ) {
        chrome.tabs.sendMessage(results.externalWebAppTabID, {
          type: 'not-distracted',
        });
      }
    }
  );
}

function show_away_from_computer_overlay() {
  chrome.storage.sync.get(
    ['user_id', 'user_client_id', 'session_id', 'externalWebAppTabID'],
    results => {
      if (
        results &&
        results.session_id &&
        results.user_client_id &&
        results.user_id &&
        results.externalWebAppTabID
      ) {
        fetch(`${globals.webapp_api_url}/send_push_notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_message_plain: globals.notification_message_plain,
            notification_title: globals.notification_title,
            notification_image: globals.notification_image,
            user_client_id: results.user_client_id,
            notification_link: globals.notification_link,
          }),
        }).then(response => {
          chrome.tabs.sendMessage(results.externalWebAppTabID, {
            type: 'distracted',
          });
        });
      }
    }
  );
}

/**
 * Show an overlay to tell the user that we think they're distracted.
 */
export function show_distracted_overlay() {
  document.getElementById('overlay_bg').style.display = 'block';
  document.getElementById('distracted_overlay_content').style.display = 'block';
}

/**
 * Hide the overlay that was telling the user that we think they've stepped away from the computer.
 */
function hide_relevant_overlay() {
  document.getElementById('overlay_bg').style.display = 'none';
  document.getElementById('relevant_overlay_content').style.display = 'none';
  document.getElementById('populate_make_relevant').innerHTML = '';
}

/**
 * Hide the overlay that was telling the user that we think they've stepped away from the computer.
 */
function hide_away_overlay() {
  clearTimeout(globals.afk_counter);
  globals.afk_counter = null;
  document.getElementById('overlay_bg').style.display = 'none';
  document.getElementById('away_from_computer_overlay_content').style.display =
    'none';
}

function request_return_verification() {
  let afk_request_return_verification = new Event(
    'afk_request_return_verification'
  );
  document.dispatchEvent(afk_request_return_verification);
}

/**
 * Hide the overlay that was telling the user that we think they're distracted.
 */
function hide_distracted_overlay() {
  document.getElementById('overlay_bg').style.display = 'none';
  document.getElementById('distracted_overlay_content').style.display = 'none';
}

/**
 * Close the overlay, subtract a point from the distraction counter.
 * Open a new tab that has a search for relevant topics.
 */
function get_back_to_studying(event) {
  console.log('closing the overlay and taking away one distraction point');
  hide_distracted_overlay();
  globals.distraction_counter--;
  chrome.storage.sync.get('keywords', results => {
    let keywords_list = results.keywords.split('~').filter(el => el.length > 0);
    let relevant_topic = keywords_list[0];
    let win = window.open(
      `https://google.com/search?q=${relevant_topic}`,
      '_blank'
    );
    win.focus();
  });
}

function addPageToDOM(msg, sender, sendResponse) {
  let add_pages_visited = document.querySelector('#add_pages_visited');
  let page_visited_row = getVisitedPageContent(msg.data);
  add_pages_visited.insertAdjacentHTML('afterbegin', page_visited_row); 
  return true;
}

/* Create html content */
const getVisitedPageContent = response => {
  const time_loaded = new Date().getTime();

  console.log(response);
  if (!response.is_transitional) {
    adjust_distraction_counter(response.is_relevant);
  }

  let add_pages_visited = document.querySelector('#add_pages_visited');
  let first_child = add_pages_visited.firstElementChild;
  if (!!first_child && first_child.classList.contains('page_list_item')) {
    let time_div = first_child.getElementsByClassName('populate_time_spent')[0];
    let previous_time = time_div.getAttribute('time_loaded');
    let time_delta = (time_loaded - Number(previous_time)) / 1000;
    let time_delta_mins = Math.floor(time_delta / 60);
    let time_delta_secs = Math.floor(time_delta % 60);
    if (time_delta_secs < 10) {
      time_delta_secs = '0' + time_delta_secs;
    }
    let display_time = `${time_delta_mins}:${time_delta_secs}`;
    time_div.innerText = display_time;
  }

  const page_id = escape_for_display(response.page_id);
  const keywords = escape_for_display(response.keywords);
  const doc_title = escape_for_display(response.doc_title);

  let yes_class =
    !response.is_transitional & response.is_relevant
      ? 'btn-success'
      : 'btn-light';
  let mr_class =
    !response.is_transitional & !response.is_relevant
      ? 'make_relevant_button'
      : '';
  let mt_class =
    !response.is_transitional & !response.is_relevant
      ? 'make_relevant_button'
      : ''; //TODO add this to the transitional button bellow
  let no_class =
    !response.is_transitional & !response.is_relevant
      ? 'btn-danger'
      : 'btn-light';
  let transit_class = response.is_transitional ? 'btn-secondary' : 'btn-light';
  try {
    return `
          <div class="row page_list_item" page_id="${page_id}">
              <div class="col-2 populate_time_spent" time_loaded="${time_loaded}">
              . . .
              </div>
              <div class="col-7 row page_list_title" style="overflow: hidden; white-space: nowrap;">
                  ${doc_title}
              </div>
              <button class="col-1 btn ${yes_class} ${mr_class}"
                  page_id="${page_id}"
                  noun_keywords="${keywords}">
                      ${response.is_relevant ? '' : '<span class="mytooltip">'}
                      Yes
                      ${
                        response.is_relevant
                          ? ''
                          : '<span class="mytooltiptext">Change this page to relevant.</span> </span>'
                      }
              </button>
              <button class="col-1 btn ${no_class}" disabled>
                  No
              </button>
              <button class="col-1 btn ${transit_class}" disabled>
                  Transit
              </button>
          </div>
          `;
  } catch (e) {
    console.log('unable to render');
    return '<div class="row">Unable to render this page</div>';
  }
};

function setup_display() {
  chrome.storage.sync.get(
    [
      'session_id',
      'start_time',
      'user_name',
      'user_id',
      'description',
      'keywords',
    ],
    result => {
      //Check that everything is OK
      if (!result || !result.session_id || !result.user_name) {
        console.error('THERE WAS SOMETHING WRONG WITH SAVING THE SESSION');
      }

      let keywords_list = result.keywords
        .split('~')
        .filter(el => el.length > 0)
        .map(el => escape_for_display(el));
      let keywords_tags = `
                ${keywords_list
                  .map(
                    keyword => ` 
                    <div class="col-4 keyword_list_item">
                        ${keyword}
                    </div>
                `
                  )
                  .join('')}
        `;

      document.getElementById('populate_keywords').innerHTML = keywords_tags;
      document.getElementById('populate_description').innerText =
        result.description;

      let relevant_topic = keywords_list[0];
      // let win = window.open(`https://google.com/search?q=${relevant_topic}`, '_blank');
      // win.focus();

      // calculate how much time is left in the session
      let start_time = new Date(result.start_time);
      function get_timer() {
        let diff = new Date() - start_time;
        let mins = Math.floor(diff / 1000 / 60);
        let hours = Math.floor(mins / 60);
        let secs = Math.floor((diff / 1000) % 60);
        if (secs < 10) {
          secs = '0' + secs;
        }
        if (mins < 10) {
          mins = '0' + mins;
        }
        if (hours < 10) {
          hours = '0' + hours;
        }
        return `${hours}:${mins}:${secs}`;
      }

      //Update the clock every second using the above calculations
      setInterval(function () {
        document.getElementById('populate_countdown_clock').innerText =
          get_timer();
      }, 1000);
    }
  );
}
