import { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

const VoiceMessage = ({ voiceUrl, duration, isOwnMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * duration;
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      isOwnMessage ? 'bg-primary text-primary-content' : 'bg-base-200'
    }`}>
      <button
        onClick={handlePlayPause}
        className={`btn btn-circle btn-sm ${
          isOwnMessage ? 'btn-primary-content' : 'btn-primary'
        }`}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        {/* Progress bar */}
        <div 
          className="w-full h-2 bg-base-300 rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div 
            className={`h-full rounded-full transition-all ${
              isOwnMessage ? 'bg-primary-content' : 'bg-primary'
            }`}
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={voiceUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
};

export default VoiceMessage;
