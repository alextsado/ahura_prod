/**
 * singleton for dealing with Media in the window
 *
 * @Author Barnaby B.
 * @Since Nov 28th 2018
 */

export let media = new MediaLib();

var MediaLib = class {


    /**
    * Upload the webcamera stream every 6 seconds.
    */
    constructor(){
        console.log("media lib constructor");

        this._session_id = "no_session";
        this._user_id = "no_user";

        navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
          this.media_recorder = new MediaRecorder(stream);
          this.media_recorder.ondataavailable = e => {
              upload_blob(e.data);
          }
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
    start_recording(session_id){
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
            this.media_recorder.stop();
        }else{
            alert("failed to stop recording because no media recorder exists");
        }
    }


    /**
     * POST the video clip
     */
    upload_blob(video_data){
        const timestamp = new Date().getTime();
        const post_url = "https://devapi.spentaai.com/vid/${this._user_id}/${this._session_id}/${timestamp}"
        const form_data = new FormData();
        form_data.append("file", video_data)
        fetch(post_url, {body: form_data});
         
    }
}
