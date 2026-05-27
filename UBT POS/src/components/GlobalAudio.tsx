"use client";
import { useEffect } from "react";

export default function GlobalAudio() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        
        const unlock = () => {
            const audio = document.getElementById("notification-audio") as HTMLAudioElement;
            if (audio) {
                // Play and immediately pause to unlock the audio element for this session
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                }).catch(() => {});
            }
            // Remove listeners after first interaction
            document.removeEventListener("click", unlock);
            document.removeEventListener("touchstart", unlock);
        };

        // Attach globally so any interaction (even on the login page) unlocks the audio
        document.addEventListener("click", unlock);
        document.addEventListener("touchstart", unlock);
        
        return () => {
            document.removeEventListener("click", unlock);
            document.removeEventListener("touchstart", unlock);
        };
    }, []);

    return <audio id="notification-audio" src="/notification.mp3" preload="auto" />;
}
