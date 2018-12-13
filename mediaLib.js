/**
 * Packaged up functions for dealing with Media in the window
 *
 * @Author Barnaby B.
 * @Since Nov 28th 2018
 */
var MediaLib = class {


    /**
    * Upload the webcamera stream every 6 seconds.
    * TODO call this when a user starts a new session, if a user_id exists.
    */
    constructor(){
        console.log("media lib constructor");

        navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
          this.media_recorder = new MediaRecorder(stream);
          this.media_recorder.ondataavailable = e => {
              upload_blob(e.data);
          }
        });
    }


    /**
     * If the media_recorder is set up then start recording in 6 second intervals
     */
    start_recording(session_id){
        if(!!this.media_recorder){
            media_recorder.start(6000);
        }else{
            alert("Failed to start media recorder. Please reload the page and try again.")
        }
    }

    /*
     * If the recorder is set up then stop recording
     */
    stop_recording(){
        if(!!media_recorder){
            media_recorder.stop();
        }else{
            alert("failed to stop recording because no media recorder exists");
        }
    }



    /**
     * POST the video clip
     */
    upload_blob(video_data){
        alert("upload_blob is not implemented");
    }
}
