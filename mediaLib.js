/**
 * Packaged up functions for dealing with Media in the window
 *
 * @Author Barnaby B.
 * @Since Nov 28th 2018
 */

let media_recorder; //will store the video in 6 second chunks for upload


/**
* Upload the webcamera stream every 6 seconds.
* TODO call this when a user starts a new session.
*/
export function setup_recording(){
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(stream=>{
      media_recorder = new MediaRecorder(stream);
      media_recorder.ondataavailable = e => {
          upload_blob(e.data);
      }
    });
}


/**
 * If the media_recorder is set up then start recording in 6 second intervals
 */
export function start_recording(){
    if(!!media_recorder){
        media_recorder.start(6000);
    }else{
        alert("Failed to start media recorder. Please reload the page and try again.")
    }
}

/*
 * If the recorder is set up then stop recording
 */
export function stop_recording(){
    if(!!media_recorder){
        media_recorder.stop();
    }else{
        alert("failed to stop recording because no media recorder exists");
    }
}



/**
 * POST the video clip
 */
function upload_blob(video_data){
    alert("upload_blob is not implemented");
}
