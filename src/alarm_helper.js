
/*
 * Determine whether the time passed in is past the current time.
 *
 * @param alarm_time - after when are we supposed to sound the alarm today? Should be in the format 00:00:00
 */
export function is_past_time(alarm_time){
    const cur_time = new Date();
    const cur_hour = cur_time.getHour();
    const cur_min = cur_time.getMinutes();
    const alarm_hour = parseInt(alarm_time.split(":")[0])
    const alarm_min = parseInt(alarm_time.split(":")[1])
    return cur_hour + (cur_min * 0.01) >= alarm_hour + (cur_min * 0.01);
}


/*
 * Determine the day of the week, and get todays alarm time
 * TODO code review this method. It's got a LOT of nesting, perhaps more than it needs.
 */
export function get_todays_alarm_time(){
    return new Promise((resolve, reject) => {
        //If there is no schedule set, then set it to 3:00 every day
        let default_alarm_times = {
            "last_synched": new Date(),
            "monday": "15:00:00",
            "tuesday": "15:00:00",
            "wednesday": "15:00:00",
            "thursday": "15:00:00",
            "friday": "15:00:00",
            "saturday": "",
            "sunday": ""
        }

        let cur_day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()]  
        chrome.storage.local.get(['alarm_times', "user_id"], result => {
            if(!!result.alarm_times){
                resolve(result.alarm_times[cur_day])
            }else{
                chrome.storage.local.set({"alarm_times": default_alarm_times});
                resolve(default_alarm_times[cur_day])
                /*  TODO test all of this out
                fetch(`${globals.api_url}/users/${result.user_id}/goals/`).then( get_response => {
                    if(!!get_response.ok && !!get_response.json()){
                        chrome.storage.local.set({"alarm_times": get_response.json()});
                        resolve(get_response.json()[cur_day]);
                    }else{
                        fetch(`${globals.api_url}/users/${result.user_id}/goals/`,{
                            headers: {
                                "Content-Type": "application/json;charset=UTF-8"
                            },
                            credentials: "same-origin",
                            method: "POST",
                            body: JSON.stringify(default_alarm_times)
                        }).then( post_response => {
                            if(!post_response.ok){
                                console.log("for some reason the server did not save the default goal settings");
                            }
                            chrome.storage.local.set({"alarm_times": post_response.json()});
                            resolve(post_response.json()[cur_day]);
                        });
                    }
                });
                */
            }
        });
    });
}


