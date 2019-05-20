/**
 * Method for setting up the alarm functionality in the app
 * Used by both the background and (at least temporarily) the alarm pages
 *
 * @AUthor Barnaby B.
 * @Since March 15, 2019
 */

/*
 * Determine whether the time passed in is past the current time.
 *
 * @param alarm_time - after when are we supposed to sound the alarm today? Should be in the format 00:00:00
 * @return boolean - true if it's after today's alarm time, false if not yet
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
        //If there is no schedule set, then set it to 3:00 every weekday, and the duration at a half-hour
        const cur_time = new Date();
        const default_alarm_times = {
            "last_synched": cur_time,
            "duration": 1800,
            "monday": "15:00:00",
            "tuesday": "15:00:00",
            "wednesday": "15:00:00",
            "thursday": "15:00:00",
            "friday": "15:00:00",
            "saturday": "",
            "sunday": ""
        }

        const cur_day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()]  
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

/*
 * Has the user studied today for longer than their goal amount
 *
 * TODO initially this will be simply based on their study time, but eventually will be received from the server.
 * @return boolean - true if they have false if they haven't
 */
export function user_met_goal_today(){
    const cur_day = new Date();
    chrome.storage.local.get(['alarm_times', "studied_today"], result => {
        if(!result.studied_today){
            const default_study = {"last_updated": cur_day, "time_studied": 0}
            chrome.storage.local.sync("studied_today", default_study);
            return false;
        }
        if(result.studied_today.last_updated.getDate() === cur_day.getDate()
            && result.studied_today.last_updated.getMonth() === cur_day.getMonth() &&
            result.studied_today.last_updated.getYear() === cur_day.getMonth()){
            //TODO then if the time_studied_today greater than alarm_times.duration
            if(result.studied_today.time_studied >== result.alarm_times.duration){
                return true;
            }
        }
        //TODO else if the time_studied is from within this hour and below the study amount then return false
        //TODO fetch the time_studied from the server, update it and perform the check again, return the result
        return false;
    });
}

function is_today(my_date){
    if(!my_date.getDate){
        my_date = new Date(my_date);
    }
    if(my_date.getDate() === cur_day.getDate() &&
        my_date.getMonth() === cur_day.getMonth() &&
        my_date.getYear() === cur_day.getMonth()){
        return true;
    }
    return false;
}
        
/*
 * After a study session send the amount of time (in seconds) that was studied today.
 * Or after getting a sync from the server then override how much was studied today with the server stats.
 *
 * @param seconds_studied - the total number of seconds studied in a session, or today total,
 * @param override - Should we override the value currently stored? defaults to false, which means we add to the value instead.
 */
export function update_time_studied(seconds_studied, override = false){
    //TODO test that seconds_studied is valid: e.g. 0 < x < 9*60*60 (which is 32,400)
    if(!override){
        chrome.storage.local.get(["studied_today"], result => {
            const cur_time = new Date();
            if(is_today(result.studied_today.last_updated)){
                const cur_time = new Date();
                let new_studied_time = result.studied_today.time_studied + seconds_studied;
                const updated_studied_today = {"last_updated": cur_time, time_studied = new_studied_time}
                chrome.storage.local.set({"studied_today": updated_studied_today}) 
            }else{ //It's not from today, so start from zero
                const updated_studied_today = {"last_updated": cur_time, time_studied: seconds_studied}
                chrome.storage.local.set({"studied_today": updated_studied_today}) 
            }
        });
    }else{ //TODO else it's from a previous day so start at 0
        const cur_time = new Date();
        const updated_studied_today = {"last_updated": cur_time, time_studied: seconds_studied}
        chrome.storage.local.set({"studied_today": updated_studied_today}) 
    }
}
