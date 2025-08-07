import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

const VoiceRecorder = ({ onSendVoice, isRecording, setIsRecording }) => {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .catch(err => {
        console.error("Microphone permission denied:", err);
      });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        setAudioBlob(audioBlob);
        
        // Get duration
        const audio = new Audio(audioUrl);
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });
      };

      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecordingAudio(false);
      clearInterval(timerRef.current);
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    setRecordedAudio(null);
    setAudioBlob(null);
    setDuration(0);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const sendVoiceMessage = async () => {
    if (audioBlob) {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result;
        onSendVoice(base64Audio, duration);
        deleteRecording();
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
      {!recordedAudio ? (
        // Recording interface
        <div className="flex items-center gap-2">
          {!isRecordingAudio ? (
            <button
              onClick={startRecording}
              className="btn btn-circle btn-sm btn-primary"
              title="Start recording"
            >
              <Mic className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="btn btn-circle btn-sm btn-error"
              title="Stop recording"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          
          {isRecordingAudio && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
      ) : (
        // Playback interface
        <div className="flex items-center gap-2">
          <button
            onClick={playRecording}
            className="btn btn-circle btn-sm btn-primary"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <span className="text-sm font-medium">{formatTime(duration)}</span>
          
          <button
            onClick={sendVoiceMessage}
            className="btn btn-sm btn-success"
            title="Send voice message"
          >
            Send
          </button>
          
          <button
            onClick={deleteRecording}
            className="btn btn-circle btn-sm btn-ghost"
            title="Delete recording"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
      
      {/* Hidden audio element for playback */}
      {recordedAudio && (
        <audio
          ref={audioRef}
          src={recordedAudio}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
    </div>
  );
};

export default VoiceRecorder;
