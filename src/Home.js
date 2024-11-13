import React, { useEffect, useRef, useState } from "react";
// import "font-awesome/css/font-awesome.min.css";
import { RtmChannel } from "agora-rtm-sdk";
import { ICameraVideoTrack, IRemoteVideoTrack, IAgoraRTCClient, IRemoteAudioTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import AgoraRTC from "agora-rtc-sdk-ng"
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';


import { RemoteAudioTrack, useJoin, useRemoteAudioTracks, useRemoteUsers } from "agora-rtc-react";


import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { VideoCameraBack } from "@mui/icons-material";

import "./style.css"; // Import your styles from the same location in React

// Video Player Component
export const VideoPlayer = ({ videoTrack, style }) => {
    const ref = useRef(null);

    useEffect(() => {
        const playerRef = ref.current;
        if (!videoTrack) return;
        if (!playerRef) return;
         videoTrack.play(playerRef); 
    
        return () => {
            videoTrack.stop();
        };
    }, [videoTrack]);

    const defaultStyle = {
        width: '100%',
        height: '100%',
        borderRadius: '8px',

    };


    return <div ref={ref} style={defaultStyle}></div>;
};

// Utility functions for room management (connecting, getting rooms, etc.)
async function createRoom(userId) {

    const response = await axios.post(`http://localhost:3000/api/rooms/?userId=${userId}`, {
        withCredentials: true // Include credentials in axios
    });
    console.log(response);

    return await response.data;
}

async function getRandomRoom(userId) {

    const response = await axios.get(`http://localhost:3000/api/rooms/?userId=${userId}`, {
        withCredentials: true // Include credentials in axios
    });
    console.log(response);
    return await response;

}

async function setRoomToWaiting(roomId) {

    const response = await axios.put(`http://localhost:3000/api/rooms/${roomId}`, {
        withCredentials: true // Include credentials in axios
    });
    console.log("set room to waiting",response)
    return await response.data;
}

// Connect to Agora RTM
async function connectToAgoraRtm(roomId, userId, onMessage, token) {
    const { default: AgoraRTM } = await import("agora-rtm-sdk");
    const client = AgoraRTM.createInstance("7d76c8034f6442d38c3860aab321d2bf");
    
    try {
        await client.login({ uid: userId, token });
    } catch (error) {
        console.error("Failed to login:", error);
        return;
    }
    
    const channel = await client.createChannel(roomId);
    await channel.join();
    channel.on("ChannelMessage", (message, userId) => {
        onMessage({
            userId,
            message: message.text,
        });
    });

    return {
        channel,
    };
}

// Main React Component (Home)
export default function Home() {
    const [userId] = useState(String(uuidv4()));
    const [room, setRoom] = useState();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [themVideo, setThemVideo] = useState();
    const [myVideo, setMyVideo] = useState();
    const [myAudio, setAudio] = useState();
    const [themAudio, setThemAudio] = useState();
    const channelRef = useRef();
    const rtcClientRef = useRef();
    const [micMuted, setmicMuted] = useState(true);
    const [camMuted, setcamMuted] = useState(true);
    


    let audioTracks = {
        localAudioTrack: null,
        remoteAudioTrack: null
    }

    let vidTracks = {
        localvidTrack: null,
        remotevidTrack: null
    }



    async function connectToAgoraRtc(roomId, userId, onVideoConnect, onWebcamStart, onAudioConnect, token) {

        const client = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
        });

        await client.join(
            "7d76c8034f6442d38c3860aab321d2bf",
            roomId,
            token,
            userId
        );

        client.on("user-published", (themUser, mediaType) => {
            client.subscribe(themUser, mediaType).then(() => {
                if (mediaType === "video") {
                    onVideoConnect(themUser.videoTrack);
                }
                if (mediaType === "audio") {
                    onAudioConnect(themUser.audioTrack);
                    themUser.audioTrack?.play();
                }
            });
        });

        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        onWebcamStart(tracks[1]);
        await client.publish(tracks);

        // audioTracks.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        // vidTracks.localvidTrack = await AgoraRTC.createCameraVideoTrack();

        // audioTracks.localAudioTrack.setMuted(micMuted);
        // client.publish(audioTracks.localAudioTrack);
        // client.publish(vidTracks.localvidTrack);
        // onWebcamStart(vidTracks.localvidTrack);

        return { tracks,client };
    }

    function handleNextClick() {
        connectToARoom();
    }

    function handleStartChattingClicked() {
        connectToARoom();
    }

    async function toggleCamera() {
        if (camMuted) {
            setcamMuted(false);
        }
        else {
            setcamMuted(true);
        }
        if (myVideo) {
            myVideo.setEnabled(!camMuted);
        }

     
        
    }

    async function toggleMic() {
        if (micMuted) {
            setmicMuted(false);
            
        }
        else {
            setmicMuted(true);
        }
        if (myAudio) {
            myAudio.setMuted(micMuted);
        }
    }

    async function handleSubmitMessage(e) {
        e.preventDefault();
        await channelRef.current?.sendMessage({
            text: input,
        });
        setMessages((cur) => [
            ...cur,
            {
                userId,
                message: input,
            },
        ]);
        setInput("");
    }

    async function connectToARoom() {
        setThemAudio(undefined);
        setThemVideo(undefined);
        setMyVideo(undefined);
        setMessages([]);

        if (channelRef.current) {
            await channelRef.current.leave();
        }

        if (rtcClientRef.current) {
            rtcClientRef.current.leave();
        }

        const response = await getRandomRoom(userId);
        const { rooms, rtcToken, rtmToken } = response.data;


        if (room) {
            await setRoomToWaiting(room._id);
        }

        if (rooms.length > 0) {
            setRoom(rooms[0]);
            const { channel } = await connectToAgoraRtm(
                rooms[0]._id,
                userId,
                (message) => setMessages((cur) => [...cur, message]),
                rtmToken
            );
            channelRef.current = channel;
            const { tracks, client } = await connectToAgoraRtc(
                rooms[0]._id,
                userId,
                (themVideo) => setThemVideo(themVideo),
                (myVideo) => setMyVideo(myVideo),
                (themAudio) => setThemAudio(themAudio),
                rtcToken
            );
            rtcClientRef.current = client;
            setAudio(tracks[0]);
        }

        else {
            const { room, rtcToken, rtmToken } = await createRoom(userId);
            console.log("room", room);
            setRoom(room);
            const { channel } = await connectToAgoraRtm(
                room._id,
                userId,
                (message) => setMessages((cur) => [...cur, message]),
                rtmToken
            );
            channelRef.current = channel;

            const { client } = await connectToAgoraRtc(
                room._id,
                userId,
                (themVideo) => setThemVideo(themVideo),
                (myVideo) => setMyVideo(myVideo),
                (themAudio) => setThemAudio(themAudio),
                rtcToken
            );
            rtcClientRef.current = client;
        }
    }



    function convertToYouThem(message) {
        return message.userId === userId ? "You" : "Them";
    }

    const isChatting = room;

    return (
        <div className="main">
            {isChatting ? (
                <>
                <div className="wow">
                  Room ID:  {room._id}
                    </div>
                    <div className="chat-window">
                        <div className="video-panel">
                            <div className="video-stream">
                                {myVideo && (
                                    <VideoPlayer
                                        style={{ width: "100%", height: "100%" }}
                                        videoTrack={myVideo}
                                    />
                                )}
                                <button onClick={toggleCamera}>
                                    {camMuted ? <VideoCameraBack /> : <VideocamOffIcon />}

                                </button>

                                <button onClick={toggleMic}>
                                    {micMuted ? <MicIcon /> : <MicOffIcon />}
                                </button>
                            </div>
                            <div className="video-stream">
                                {themVideo && (
                                    <VideoPlayer
                                        style={{ width: "100%", height: "100%" }}
                                        videoTrack={themVideo}
                                        
                                    />
                                )}
                            </div>
                        </div>

                        <div className="chat-panel">
                            <ul>
                                {messages.map((message, idx) => (
                                    <li key={idx}>
                                        {convertToYouThem(message)} - {message.message}
                                    </li>
                                ))}
                            </ul>

                            <form onSubmit={handleSubmitMessage}>
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <div className="iff">
                                <button className="btn">Submit</button>
                                 </div>
                            </form>
                            <button className="btn" onClick={handleNextClick}>Next</button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                <div className="wo">                Welcome to Peer-To-Peer RTM & RTC
                </div>
                    <button className="start" onClick={handleStartChattingClicked}>Click Here To Start Chatting</button>
                </>
            )}
        </div>
    );
}
