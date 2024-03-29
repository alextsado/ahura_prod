'use strict';
/**
 * singleton for dealing with Media in the window
 *
 * @Author Barnaby B.
 * @Since Nov 28th 2018
 */

import { globals } from "./globals.js";
var MediaLib = class {


    /**
    * Upload the webcamera stream every 6 seconds.
    */
    constructor(){

        this._session_id = "no_session";
        this._user_id = "no_user";

        navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
          this.media_recorder = new MediaRecorder(stream);
          this.media_recorder.ondataavailable = e => {
              this.upload_blob(e.data);
          }
            this.media_recorder.start(6000);
        });
    }

    // Setter for session id
    set session_id(new_session_id){
        this._session_id = new_session_id;
    }

    // Setter for user id
    set user_id(new_user_id){
        this._user_id = new_user_id;
    }


    /**
     * If the media_recorder is set up then start recording in 6 second intervals
     */
    start_recording(){
        if(!this._user_id){
            alert("No user id");
        }
        if(!!this.media_recorder){
            this.media_recorder.start(6000);
        }else{
            alert("Failed to start media recorder. Please reload the page and try again.")
        }
    }

    /*
     * If the recorder is set up then stop recording
     */
    stop_recording(){
        if(!!this.media_recorder){
            try{
                this.media_recorder.stop();
            }catch(e){
                this.media_recorder = null;
            }
        }else{
            console.log("failed to stop recording because no media recorder exists");
        }
    }


    /**
     * POST the video clip
     */
    upload_blob(video_data){
        const timestamp = new Date().getTime();
        const post_url = `${globals.api_url}/video/${this._user_id}/${this._session_id}/${timestamp}/`
        const form_data = new FormData();
        form_data.append("video_file", video_data)
        fetch(post_url, {method: "post", body: form_data}).then(response => {
            if(!response || !response.ok){
                document.querySelector("#error_content").innerText = "The video upload is failing. Data is not being collected.";
                document.querySelector("#error_content").style.display = "contents";
            }
        });
         
    }
}

export let media = new MediaLib();
