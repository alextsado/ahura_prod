'use strict';

import { globals } from '../globals.js';
import { escape_for_display } from '../escape_for_display.js';

/* Global variables */
let externalWebAppTabID = null;
let researchWindow = null;
let chat_window;

/*---------------------Chrome message listener--------------------- */
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('MESSAGE RECEIVED', msg, sender);

  if (msg.type === 'summary_text') {
    const data = await saveVisitedPage(msg, sender, sendResponse);
    if (data && externalWebAppTabID) {
      chrome.tabs.sendMessage(externalWebAppTabID, {
        type: 'page_visited',
        data,
      });
    }
  }

  return true;
});

/*----------------------Chrome tabs listener-------------------- */
chrome.tabs.onActivated.addListener(activateInfo => {
  chrome.tabs.sendMessage(activateInfo.tabId, {
    type: 'rescan',
  });
});

// rescan page when ahura tab is updated
// TODO: Not working as expected
// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
//   if (externalWebAppTabID && externalWebAppTabID === tabId) {
//     if (changeInfo?.status === 'complete' && !!tab.active) {
//       console.log({ tabId, changeInfo, tab });
//       chrome.storage.sync.get(['session_id', 'user_id'], results => {
//         if (!!results && !!results.session_id) {
//           chrome.tabs.sendMessage(externalWebAppTabID, {
//             type: 'rescan',
//           });
//         }
//       });
//     }
//   }
// });

// Close session when external webapp tab is removed
// Also work when ahura chrome window is removed
chrome.tabs.onRemoved.addListener((tabId, removed) => {
  if (tabId === externalWebAppTabID) {
    chrome.storage.sync.get(['session_id', 'user_id'], async results => {
      chrome.storage.sync.set({ externalWebAppTabID: null });
      externalWebAppTabID = null;

      if (researchWindow && researchWindow.id) {
        await chrome.windows.remove(researchWindow.id);
        researchWindow = null;
      }
      if (!!results && !!results.session_id) {
        console.log('WEBAPP CLOSED!');
        stopSession(results);
      }
    });
  }
});

// Stop session when extension research window is closed
chrome.windows.onRemoved.addListener(windowId => {
  if (researchWindow && researchWindow.id === windowId) {
    chrome.storage.sync.get(['session_id', 'user_id'], async results => {
      await chrome.windows.remove(researchWindow.id);
      researchWindow = null;
      if (!!results && !!results.session_id) {
        console.log('CHROME EXTENSION CLOSED!');
        stopSession(results);
      }
    });
  }
});

// When a user clicks the icon then open a new window
// chrome.browserAction.onClicked.addListener(function (tab) {
//   open_window(chat_window, win => (chat_window = win));
// });

// export function open_window(chat_window, callback) {
//   let open_url = '/html/research.html';
//   chrome.windows.create(
//     {
//       url: chrome.runtime.getURL(open_url),
//       type: 'popup',
//       focused: true,
//       width: 1020,
//       height: 600,
//     },
//     win => {
//       callback(win);
//       chat_window = win;
//     }
//   );
// }

/*---------------------Listen external message--------------------- */
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    // create user
    if (request.user) {
      const { user_name, user_client_id, user_password } = request.user;
      externalWebAppTabID = sender.tab.id;
      saveUser(user_name, user_client_id, user_password, sender.tab.id)
        .then(user_id => {
          console.log('USER SAVE');
          sendResponse({ data: user_id });
        })
        .catch(err => sendResponse({ error: err }));
    }

    // get user if exist in chrome storage
    if (request.get) {
      chrome.storage.sync.get(['user_id', 'user_name'], data => {
        if (data) {
          console.log('GET USER', sender);
          externalWebAppTabID = sender.tab.id;
          chrome.storage.sync.set({
            externalWebAppTabID: sender.tab.id,
          });
          sendResponse({ data: 'success' });
        } else {
          sendResponse({ error: true });
        }
      });
    }

    if (request.saveUser) {
      const { user_id, user_name, user_client_id } = request;
      externalWebAppTabID = sender.tab.id;
      chrome.storage.sync.set({
        user_name: user_name,
        user_id: user_id,
        user_client_id: user_client_id,
        externalWebAppTabID: sender.tab.id,
      }, () => {
        console.log('SAVE USER');
        sendResponse('success');
      });
    }

    // create session
    if (request.session) {
      const start_time = new Date().getTime();
      const { description } = request.session;
      startSession({ description, start_time })
        .then(session_id => {
          chrome.storage.sync.get(
            ['session_id', 'start_time', 'description', 'keywords'],
            data => {
              openResearchWindow();
              sendResponse({ data: { session_id, start_time } });
            }
          );
        })
        .catch(error => sendResponse({ error: error }));
    }

    // stop session
    if (request.stop_session) {
      chrome.storage.sync.get(
        ['session_id', 'start_time', 'user_id'],
        results => {
          if (!!results && !!results.session_id) {
            stopSession(results, sendResponse);
          }
        }
      );
    }
  }
);

/*---------------------listener functions--------------------- */
// Stop existing session
const stopSession = (results, sendResponse) => {
  const stop_time = new Date().getTime();
  const pkg = {
    stop_time: stop_time,
  };

  const session_id = results.session_id;
  if (!results || !results.session_id) {
    console.error('There is no session ID but we called STOP on it');
  }

  fetch(`${globals.api_url}/sessions/${session_id}/`, {
    method: 'POST',
    body: JSON.stringify(pkg),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  })
    .then(
      response => {
        if (response.status <= 299) {
          chrome.storage.sync.set(
            {
              session_id: null,
              start_time: null,
            },
            async () => {
              if (researchWindow && researchWindow.id) {
                await chrome.windows.remove(researchWindow.id);
                researchWindow = null;
              }
              return response.json();
            }
          );
        }
      },
      error => {
        console.log(error.message);
      }
    )
    .then(res => {
      console.log('SESSION STOP!');
      fetch(`${globals.api_url}/sessions/${session_id}/basic-report/`)
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Problem encountered on the server');
          }
        })
        .then(response => {
          console.log('BASIC REPORT!');
          console.log(response);
          sendResponse && sendResponse({ success: res, data: response });
        })
        .catch(error => {
          sendResponse && sendResponse({ success: res, data: error });
          console.log(error);
        });
    });
};

// Send visited pages data to server and check relevance
const saveVisitedPage = async (msg, sender, sendResponse) => {
  let pkg = {
    doc_title: msg.doc_title,
    url: sender.url,
    content: msg.message,
    load_time: msg.load_time,
    is_relevant: true,
    tab_id: sender.tab.id,
  };

  const getPagesInfo = new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      ['session_id', 'start_time', 'user_id'],
      results => {
        if (!results || !results.session_id) {
          console.log('There is no session ID but we called STOP on it');
        }
        pkg['session_id'] = results.session_id;
        fetch(`${globals.api_url}/pages/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
          body: JSON.stringify(pkg),
        })
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error('Network response was not OK');
            }
          })
          .then(response => {
            console.log('GET PAGES', msg);
            response.doc_title = msg.doc_title;
            response.url = sender.url;
            const data = getVisitedPageContent(response);
            
            // Send response to research.js
            chrome.runtime.sendMessage({
              type: 'add-page',
              data: response
            });

            if (data) {
              resolve(data);
            }
          })
          .catch(error => {
            console.log('THERE WAS AN ERROR SHOWING A PAGE!!!', error);
            reject(false);
          });
      }
    );
  });

  const data = await getPagesInfo;
  return data || false;
};

// Create html content
const getVisitedPageContent = response => {
  const time_loaded = new Date().getTime();
  const displayTime = new Date().toLocaleTimeString();
  const page_id = escape_for_display(response.page_id);
  const keywords = escape_for_display(response.keywords);
  const doc_title = escape_for_display(response.doc_title);

  try {
    return `
    <div page_id="${page_id}" class='session-info-pill mb-3 p-3 radius-15 d-flex flex-nowrap align-items-center justify-content-between'>
    <div class='align-items-center'>
      <div time_loaded="${time_loaded}" class='display-7 mr-4'>${displayTime}</div>
      <div>
        <div class='display-7'>${doc_title}</div>
        <div class='font-bold text-primary font-14'>
         ${response.url}
        </div>
      </div>
    </div>
    <div class='text-primary ${
      response.is_relevant && response.is_transitional
        ? 'text-purple'
        : response.is_relevant && !response.is_transitional
        ? 'text-primary'
        : 'text-alternate'
    } font-bold font-14'>
  ${
    response.is_relevant && response.is_transitional
      ? 'Transit'
      : response.is_relevant && !response.is_transitional
      ? 'Good'
      : 'Poor'
  }
  </div>
  </div>`;
  } catch (e) {
    console.log('UNABLE TO RENDER PAGE');
    return '<div class="row">Unable to render this page</div>';
  }
};

// Start new session
const startSession = msg => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('user_id', results => {
      if (!results || !results.user_id || results.user_id.length <= 0) {
        console.log('NO USER ID');
      } else {
        fetch(`${globals.api_url}/sessions/`, {
          body: JSON.stringify({
            user_id: results.user_id,
            time_started: msg.start_time,
            description: msg.description,
            additional_keywords: msg.additional_keywords,
          }),
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
          },
          method: 'post',
        })
          .then(response => {
            if (response.ok) {
              console.log('SESSION START');
              return response.json();
            } else {
              throw new Exception(response.statusText);
            }
          })
          .then(response => {
            if (!response.keywords || response.keywords.length <= 1) {
              console.log('No relative keyword');
            } else {
              chrome.storage.sync.set(
                {
                  session_id: response.session_id,
                  start_time: msg.start_time,
                  description: msg.description,
                  keywords: response.keywords,
                },
                result => {
                  resolve(response.session_id);
                }
              );
            }
          })
          .catch(error => reject(error));
      }
    });
  });
};

// Save new user in database and chrome storage
const saveUser = (user_name, user_client_id, password, externalWebAppTabID) => {
  return new Promise((resolve, reject) => {
    fetch(`${globals.api_url}/users/`, {
      method: 'post',
      body: JSON.stringify({
        user_name: user_name,
        password: password,
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8',
      },
    })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
      })
      .then(response => {
        chrome.storage.sync.set({
          user_name: user_name,
          user_id: response.user_id,
          user_client_id: user_client_id,
          externalWebAppTabID: externalWebAppTabID,
        });
        resolve(response.user_id);
      })
      .catch(err => {
        reject(err);
      });
  });
};

// Open research window
const openResearchWindow = () => {
  if (!!researchWindow) {
    try {
      chrome.windows.update(researchWindow.id, { focused: false });
    } catch (e) {
      console.log(e);
      researchWindow = null;
    }
  }
  if (!researchWindow) {
    chrome.storage.sync.get(['user_id'], results => {
      if (!!results && !!results.user_id) {
        const open_url = '/html/research.html';
        chrome.windows.create(
          {
            url: chrome.runtime.getURL(open_url),
            type: 'popup',
            focused: false,
            width: 800,
            height: 600,
          },
          win => {
            researchWindow = win;
          }
        );
      }
    });
  }
};

/*---------------------external connection--------------------- */
// Send and listen external message
// chrome.runtime.onConnectExternal.addListener(function (port) {
//   port.onMessage.addListener(msg => {
//     console.log(msg);
//   });

//   port.postMessage({ greet: 'Hello' });
// });
