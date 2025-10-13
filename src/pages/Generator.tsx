import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import PlaylistView from "@/components/PlaylistView";
import MusicPlayer from "@/components/MusicPlayer";
import { Song } from "@/data/mockData";

const Generator = () => {
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Song[]>([]);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const handlePlaylistGenerated = (playlist: Song[]) => {
    setGeneratedPlaylist(playlist);
  };

  const handlePlayAll = () => {
    setIsPlayerVisible(true);
  };

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4">
            Your Personal <span className="bg-gradient-calm bg-clip-text text-transparent">Music Therapist</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Let Aura guide you through a sonic journey tailored to your emotional needs
          </p>
        </div>

        <ChatInterface onPlaylistGenerated={handlePlaylistGenerated} />
        
        {generatedPlaylist.length > 0 && (
          <PlaylistView playlist={generatedPlaylist} onPlay={handlePlayAll} />
        )}
      </div>

      {/* Music Player */}
      {isPlayerVisible && generatedPlaylist.length > 0 && (
        <MusicPlayer playlist={generatedPlaylist} />
      )}
    </div>
  );
};

export default Generator;
